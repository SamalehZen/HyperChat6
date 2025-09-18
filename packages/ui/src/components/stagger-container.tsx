export const StaggerContainer = ({ children }: { children: React.ReactNode }) => {
    return <div className="w-full transition-opacity duration-200">{children}</div>;
};
