'use client';

type DeleteAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Account</h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          This action is permanent. Connect your account delete confirmation here.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
