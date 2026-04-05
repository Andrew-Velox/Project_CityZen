type AuthFeedbackProps = {
  type: "error" | "success";
  message: string;
};

export function AuthFeedback({ type, message }: AuthFeedbackProps) {
  return <p className={`auth-feedback auth-feedback-${type}`}>{message}</p>;
}
