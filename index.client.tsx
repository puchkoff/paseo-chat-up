import { Platform } from "react-native";

// No SDK API writes to the composer, so this is DOM-only. testIDs come from
// packages/app/src/components/message.tsx in the Paseo app.
const USER_MESSAGE = '[data-testid="user-message"]';
const HAS_TEXT = '[data-testid="user-message-trailing-row"]';

// Typechecks without the DOM library; declare only what this file uses.
type El = {
  tagName: string;
  value?: string;
  innerText: string;
  parentElement: El | null;
  firstElementChild: El | null;
  lastElementChild: El | null;
  querySelector(selector: string): El | null;
  querySelectorAll(selector: string): ArrayLike<El>;
  focus(): void;
};
declare const document: {
  addEventListener(type: string, fn: (event: any) => void, capture?: boolean): void;
  removeEventListener(type: string, fn: (event: any) => void, capture?: boolean): void;
  execCommand(command: "insertText", showUi: boolean, value: string): boolean;
};

// Latest text prompt in the chat that owns this composer: the nearest ancestor holding user messages.
function latestPrompt(input: El): string | null {
  for (let n = input.parentElement; n; n = n.parentElement) {
    const messages = n.querySelectorAll(USER_MESSAGE);
    if (!messages.length) continue;
    for (let i = messages.length - 1; i >= 0; i--) {
      // The trailing row renders only for messages with text; the text is the bubble's last child.
      if (!messages[i].querySelector(HAS_TEXT)) continue;
      const text = messages[i].firstElementChild?.firstElementChild?.lastElementChild?.innerText;
      if (text) return text;
    }
    return null;
  }
  return null;
}

export default function contribute() {
  if (Platform.OS !== "web" || typeof document === "undefined") return () => {};

  const onKeyDown = (event: any) => {
    // The app loads this once per daemon it is installed on; the second copy would insert twice.
    if (event.paseoChatUp) return;
    event.paseoChatUp = true;
    if (event.key !== "ArrowUp" || event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return;
    const input: El | null = event.target;
    if (input?.tagName !== "TEXTAREA" || input.value) return;
    const text = latestPrompt(input);
    if (!text) return;
    event.preventDefault();
    // Typed-text insert: React sees the change and Ctrl+Z undoes it.
    document.execCommand("insertText", false, text);
  };

  document.addEventListener("keydown", onKeyDown, true);
  return () => document.removeEventListener("keydown", onKeyDown, true);
}
