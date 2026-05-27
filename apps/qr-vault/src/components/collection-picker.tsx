import type { Collection } from "@/lib/storage";

type CollectionPickerProps = {
  collections: Collection[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function CollectionPicker({ collections, selectedIds, onChange }: CollectionPickerProps) {
  function toggleCollection(collectionId: string) {
    if (selectedIds.includes(collectionId)) {
      onChange(selectedIds.filter((id) => id !== collectionId));
      return;
    }

    onChange([...selectedIds, collectionId]);
  }

  if (!collections.length) {
    return <p className="empty-inline">No collections yet</p>;
  }

  return (
    <div className="collection-picker">
      {collections.map((collection) => (
        <label className="check-row" key={collection.id}>
          <input
            type="checkbox"
            checked={selectedIds.includes(collection.id)}
            onChange={() => toggleCollection(collection.id)}
          />
          <span>{collection.title}</span>
        </label>
      ))}
    </div>
  );
}
