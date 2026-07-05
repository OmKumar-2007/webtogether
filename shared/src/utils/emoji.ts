/**
 * Tiny emoji shortname → unicode map. We don't bundle a full emoji library
 * in the shared package to keep it small; clients may swap in `emoji-mart`
 * for a richer picker. This is enough to render the most common shortnames
 * inline in chat.
 */
const EMOJI_MAP: Record<string, string> = {
  ':smile:': '😄',
  ':laughing:': '😆',
  ':blush:': '😊',
  ':smiley:': '😃',
  ':wink:': '😉',
  ':joy:': '😂',
  ':rofl:': '🤣',
  ':heart:': '❤️',
  ':fire:': '🔥',
  ':thumbsup:': '👍',
  ':+1:': '👍',
  ':thumbsdown:': '👎',
  ':-1:': '👎',
  ':ok_hand:': '👌',
  ':clap:': '👏',
  ':wave:': '👋',
  ':pray:': '🙏',
  ':eyes:': '👀',
  ':thinking:': '🤔',
  ':100:': '💯',
  ':tada:': '🎉',
  ':rocket:': '🚀',
  ':star:': '⭐',
  ':warning:': '⚠️',
  ':white_check_mark:': '✅',
  ':x:': '❌',
  ':cry:': '😢',
  ':sad:': '😢',
  ':angry:': '😠',
  ':party:': '🥳',
  ':cool:': '😎',
  ':sleeping:': '😴',
  ':poop:': '💩',
  ':cat:': '🐱',
  ':dog:': '🐶',
};

/** Replace :shortname: tokens with unicode emoji. */
export function replaceEmojiShortnames(input: string): string {
  return input.replace(/:[a-z0-9_+-]+:/gi, (m) => EMOJI_MAP[m.toLowerCase()] ?? m);
}
