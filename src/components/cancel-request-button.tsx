import { cancelRequest } from "@/app/dashboard/actions";

export function CancelRequestButton({ id }: { id: string }) {
  return (
    <form action={cancelRequest}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-muted hover:text-danger">Cancel</button>
    </form>
  );
}
