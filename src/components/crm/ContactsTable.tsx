import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUpdateContactStage } from "@/hooks/useCrm";
import ContactValueField from "./ContactValueField";
import { STAGES, sourceConfig, stageConfig, type CrmContact, type CrmStage } from "./crmTypes";

export default function ContactsTable({
  contacts,
  onSelect,
}: {
  contacts: CrmContact[];
  onSelect: (contact: CrmContact) => void;
}) {
  const updateStage = useUpdateContactStage();

  return (
    <div className="border border-border bg-card overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Tags</TableHead>
            <TableHead>Stage</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="text-right">Last activity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contacts.map((contact) => {
            const src = sourceConfig[contact.source] ?? sourceConfig.manual;
            const SrcIcon = src.icon;
            return (
              <TableRow
                key={contact.id}
                className="cursor-pointer"
                onClick={() => onSelect(contact)}
              >
                <TableCell className="font-medium text-foreground whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                      {(contact.name || contact.email)[0]?.toUpperCase()}
                    </span>
                    {contact.name || "—"}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">{contact.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${src.chip} text-[10px] px-1.5 py-0.5 gap-1 border-transparent`}>
                    <SrcIcon className="w-3 h-3" />
                    {src.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap max-w-[180px]">
                    {contact.tags.length === 0 ? (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    ) : (
                      contact.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))
                    )}
                    {contact.tags.length > 3 && (
                      <span className="text-[10px] text-muted-foreground">+{contact.tags.length - 3}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Select
                    value={contact.stage}
                    onValueChange={(stage) => updateStage.mutate({ contactId: contact.id, stage: stage as CrmStage })}
                  >
                    <SelectTrigger className="h-8 w-[118px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs">
                          {stageConfig[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <ContactValueField contact={contact} />
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                  {contact.last_activity_at
                    ? formatDistanceToNow(new Date(contact.last_activity_at), { addSuffix: true })
                    : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
