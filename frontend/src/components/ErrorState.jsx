const ErrorState = ({
  title = "Something went wrong",
  message = "We couldn't complete your request. Please try again.",
  onRetry,
}) => {
  return (
    <div className="flex min-h-[55vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-7 text-center shadow-sm dark:border-red-500/20 dark:bg-slate-900">
        
        {/* Icon */}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
          <svg
            className="h-7 w-7 text-red-500 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v4m0 4h.01M10.3 3.8L2.9 17a2 2 0 001.75 3h14.7a2 2 0 001.75-3L13.7 3.8a2 2 0 00-3.4 0z"
            />
          </svg>
        </div>

        <h2 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
          {message}
        </p>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h5M20 20v-5h-5M5.5 15a7 7 0 0011.9 1.5L20 14M4 10l2.6-2.5A7 7 0 0118.5 9"
              />
            </svg>
            Try again
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;