import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Smile, Check, CheckCheck } from 'lucide-react';
import { Button } from './button';
import { Avatar } from './avatar';
import { useRoom } from '../context/room-context';
import { useUser } from '../context/user-context';
import { useToast } from '../context/toast-context';
import { formatClockTime, shouldGroupWith } from '../utils/time';
import { cx } from '../utils/cx';
import type { MessageWithAuthor } from '@shared/index';

const EMOJIS = ['😄', '😂', '🔥', '👍', '❤️', '🎉', '👀', '🤔', '😢', '😎', '💯', '🚀'];

/**
 * ChatPanel — the main chat experience.
 *
 * Features:
 *   - Message list with auto-scroll to bottom on new messages
 *   - Optimistic send (message appears instantly, replaced on ack)
 *   - Typing indicator (debounced) above the input
 *   - Read-receipt ticks for own messages
 *   - Inline emoji picker
 *   - System-event messages (joined/left) rendered subtly
 */
export function ChatPanel() {
  const { room, messages, typing, sendMessage, setTyping, markRead } = useRoom();
  const { user } = useUser();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, typing.length]);

  // Mark messages from others as read when panel is visible
  useEffect(() => {
    if (!room || !user) return;
    const others = messages
      .filter((m) => m.userId !== user.id && m.status !== 'read')
      .map((m) => m.id);
    if (others.length > 0) markRead(others);
  }, [messages, room, user, markRead]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setTyping(false);
    try {
      await sendMessage(text);
    } catch (err) {
      toast({
        title: 'Failed to send',
        description: (err as Error).message,
        variant: 'error',
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (e.target.value.length > 0) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  const groupedMessages = useMemo(() => {
    return messages.map((m, i) => ({
      message: m,
      grouped: i > 0 && shouldGroupWith(messages[i - 1], m),
    }));
  }, [messages]);

  if (!room) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="rounded-full bg-wt-surface2 p-3">
          <Send className="h-5 w-5 text-wt-muted" />
        </div>
        <div className="text-sm text-wt-muted">No active room yet</div>
        <div className="text-xs text-wt-muted/70">
          Create a room or paste an invite code to start chatting.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-1"
        role="log"
        aria-live="polite"
      >
        {groupedMessages.length === 0 && (
          <div className="flex h-full items-center justify-center px-6 text-center">
            <div className="text-xs text-wt-muted">
              No messages yet. Say hi! 👋
            </div>
          </div>
        )}
        {groupedMessages.map(({ message, grouped }) => (
          <MessageRow
            key={message.id}
            message={message}
            isOwn={message.userId === user?.id}
            grouped={grouped}
          />
        ))}

        {typing.length > 0 && (
          <div className="flex items-center gap-2 px-1 pt-1">
            <div className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-wt-muted/60 animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
            <span className="text-xs text-wt-muted">
              {typing.map((t) => t.displayName).slice(0, 2).join(', ')}
              {typing.length > 2 ? ` and ${typing.length - 2} others` : ''}
              {typing.length === 1 ? ' is' : ' are'} typing…
            </span>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-wt-border bg-wt-surface/80 backdrop-blur-md px-2 py-2">
        {emojiOpen && (
          <div className="mb-2 flex flex-wrap gap-1 rounded-lg bg-wt-surface2 p-2 animate-fade-in">
            {EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setInput((prev) => prev + e);
                  inputRef.current?.focus();
                }}
                className="rounded p-1 text-lg hover:bg-wt-border"
              >
                {e}
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-1.5">
          <button
            onClick={() => setEmojiOpen((v) => !v)}
            className={cx(
              'rounded-lg p-2 text-wt-muted hover:text-wt-text hover:bg-wt-surface2',
              emojiOpen && 'text-wt-accent',
            )}
            aria-label="Emoji picker"
          >
            <Smile className="h-4 w-4" />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${room.name}`}
            rows={1}
            className="flex-1 resize-none rounded-lg bg-wt-surface2 border border-wt-border px-3 py-2 text-sm text-wt-text placeholder:text-wt-muted focus:outline-none focus:ring-2 focus:ring-wt-accent/40 max-h-32"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!input.trim()}
            className="!px-2.5"
            aria-label="Send"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  isOwn,
  grouped,
}: {
  message: MessageWithAuthor;
  isOwn: boolean;
  grouped: boolean;
}) {
  // System messages
  if (message.systemEvent) {
    return (
      <div className="my-1 flex justify-center">
        <div className="rounded-full bg-wt-surface2/60 px-3 py-0.5 text-[11px] text-wt-muted">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cx(
        'flex gap-2 group',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        grouped ? 'mt-0.5' : 'mt-2',
      )}
    >
      <div className="w-7 shrink-0">
        {!grouped && (
          <Avatar
            name={message.author.displayName}
            color={message.author.avatarColor}
            size={28}
          />
        )}
      </div>
      <div className={cx('flex flex-col max-w-[75%]', isOwn ? 'items-end' : 'items-start')}>
        {!grouped && (
          <div
            className={cx(
              'flex items-baseline gap-1.5 mb-0.5',
              isOwn ? 'flex-row-reverse' : 'flex-row',
            )}
          >
            <span className="text-xs font-medium text-wt-text">
              {isOwn ? 'You' : message.author.displayName}
            </span>
            <span className="text-[10px] text-wt-muted">
              {formatClockTime(message.createdAt)}
            </span>
          </div>
        )}
        <div
          className={cx(
            'rounded-2xl px-3 py-1.5 text-sm break-words',
            isOwn
              ? 'bg-wt-accent text-white rounded-br-sm'
              : 'bg-wt-surface2 text-wt-text rounded-bl-sm',
          )}
          // The backend already sanitized this HTML — safe to render.
          dangerouslySetInnerHTML={{ __html: message.html }}
        />
        {isOwn && (
          <div className="mt-0.5 flex items-center text-[10px] text-wt-muted">
            {message.status === 'read' ? (
              <CheckCheck className="h-3 w-3 text-wt-accent" />
            ) : message.status === 'delivered' ? (
              <CheckCheck className="h-3 w-3" />
            ) : (
              <Check className="h-3 w-3" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
