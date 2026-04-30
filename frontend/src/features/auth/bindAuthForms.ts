export type AuthFormElements = {
  authGateSignIn: HTMLButtonElement | null;
  authGateSignUp: HTMLButtonElement | null;
  authGateLoginGoogle: HTMLButtonElement | null;
  socialSignIn: HTMLButtonElement | null;
  socialSignUp: HTMLButtonElement | null;
  socialLoginGoogle: HTMLButtonElement | null;
};

export function bindAuthFormActions(
  elements: AuthFormElements,
  actions: {
    authGateSignIn: () => Promise<void>;
    authGateSignUp: () => Promise<void>;
    authGateGoogle: () => Promise<void>;
    socialSignIn: () => Promise<void>;
    socialSignUp: () => Promise<void>;
    socialGoogle: () => Promise<void>;
  }
): void {
  elements.authGateSignIn?.addEventListener("click", () => {
    void actions.authGateSignIn();
  });
  elements.authGateSignUp?.addEventListener("click", () => {
    void actions.authGateSignUp();
  });
  elements.authGateLoginGoogle?.addEventListener("click", () => {
    void actions.authGateGoogle();
  });
  elements.socialSignIn?.addEventListener("click", () => {
    void actions.socialSignIn();
  });
  elements.socialSignUp?.addEventListener("click", () => {
    void actions.socialSignUp();
  });
  elements.socialLoginGoogle?.addEventListener("click", () => {
    void actions.socialGoogle();
  });
}
