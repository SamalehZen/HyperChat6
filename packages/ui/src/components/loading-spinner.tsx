export function Spinner() {
    return (
        <svg
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            strokeLinecap="round"
            strokeLinejoin="round"
            xmlns="http://www.w3.org/2000/svg"
            className="stroke-brand h-4 w-4 animate-spin"
        >
            <path d="M12 3v3m6.366-.366-2.12 2.12M21 12h-3m.366 6.366-2.12-2.12M12 21v-3m-6.366.366 2.12-2.12M3 12h3m-.366-6.366 2.12 2.12"></path>
        </svg>
    );
}

export function LinearSpinner() {
    return (
        <div className="flex items-center justify-center">
            <div className="flex w-6 h-6 pt-[6px] items-center justify-between">
                <span className="bg-muted-foreground block w-1 h-1 rounded-full animate-bounce [animation-delay:-0.2s]" />
                <span className="bg-muted-foreground block w-1 h-1 rounded-full animate-bounce [animation-delay:-0.1s]" />
                <span className="bg-muted-foreground block w-1 h-1 rounded-full animate-bounce" />
            </div>
        </div>
    );
}
