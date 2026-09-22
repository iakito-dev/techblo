export function shouldTriggerAutoLoad({
  hasMore,
  isIntersecting,
  isPending,
}: {
  hasMore: boolean;
  isIntersecting: boolean;
  isPending: boolean;
}) {
  return hasMore && isIntersecting && !isPending;
}
