type UnauthorizedSessionHandler = () => void | Promise<void>;

let unauthorizedSessionHandler: UnauthorizedSessionHandler | null = null;

export function setUnauthorizedSessionHandler(handler: UnauthorizedSessionHandler): void {
  unauthorizedSessionHandler = handler;
}

export async function clearUnauthorizedSession(): Promise<void> {
  if (unauthorizedSessionHandler) {
    await unauthorizedSessionHandler();
  }
}
