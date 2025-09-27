import { SearchLoadingCard } from '@repo/common/components';

export default function Loading() {
  return (
    <div className="no-scrollbar flex w-full flex-1 flex-col items-center overflow-y-auto px-8">
      <div className="mx-auto w-full max-w-3xl px-4 pb-[200px] pt-16">
        <SearchLoadingCard color="#f97316" duration={1200} thickness={2} skeletonCount={3} useAccordion={true} />
      </div>
    </div>
  );
}
