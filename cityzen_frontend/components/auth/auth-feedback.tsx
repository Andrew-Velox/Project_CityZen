type AuthFeedbackProps = {
  type: "error" | "success";
  message: string;
};

export function AuthFeedback({ type, message }: AuthFeedbackProps) {
  const toneClass =
    type === "error"
      ? "border-[#f4c8c1] bg-[#fff2ef] text-[#b9382c]"
      : "border-[#b9e5d0] bg-[#edf9f3] text-[#167a52]";

  return <p className={`rounded-xl border px-3 py-2 text-sm font-medium ${toneClass}`}>{message}</p>;
}
