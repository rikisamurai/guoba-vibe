import { FieldLabel } from '@/components/qr-form-field-label'
import { Input } from '@/components/shadcn-ui/input'
import { Textarea } from '@/components/shadcn-ui/textarea'

type QrFormMetadataFieldsProps = {
  title: string
  description: string
  onTitleChange: (next: string) => void
  onDescriptionChange: (next: string) => void
}

export function QrFormMetadataFields({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: QrFormMetadataFieldsProps) {
  return (
    <>
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="title">Title</FieldLabel>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          name="description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={4}
        />
      </div>
    </>
  )
}
