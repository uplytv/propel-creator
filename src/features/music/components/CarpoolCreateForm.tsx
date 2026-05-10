import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useCreateCarpool } from "../hooks/useCarpools";
import { useToast } from "@/hooks/use-toast";

export function CarpoolCreateForm({ defaultConcertLabel }: { defaultConcertLabel?: string }) {
  const create = useCreateCarpool();
  const { toast } = useToast();
  const [concertLabel, setConcertLabel] = useState(defaultConcertLabel ?? "");
  const [concertDate, setConcertDate] = useState("");
  const [originCity, setOriginCity] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [seats, setSeats] = useState(4);
  const [note, setNote] = useState("");

  const submit = async () => {
    if (!concertLabel.trim() || !originCity.trim()) {
      toast({ title: "Concert and origin city required", variant: "destructive" });
      return;
    }
    try {
      await create.mutateAsync({
        concert_label: concertLabel.trim(),
        origin_city: originCity.trim(),
        concert_date: concertDate || null,
        meeting_point: meetingPoint.trim() || null,
        departure_time: departureTime ? new Date(departureTime).toISOString() : null,
        total_seats: seats,
        contact_note: note.trim() || null,
      });
      toast({ title: "Carpool published" });
      setMeetingPoint("");
      setNote("");
    } catch (e: any) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="space-y-1">
        <Label htmlFor="cp-show">Concert</Label>
        <Input id="cp-show" value={concertLabel} onChange={(e) => setConcertLabel(e.target.value)} placeholder="Tame Impala · Brooklyn" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="cp-date">Date</Label>
          <Input id="cp-date" type="date" value={concertDate} onChange={(e) => setConcertDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp-seats">Seats</Label>
          <Input
            id="cp-seats"
            type="number"
            min={1}
            max={8}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
          />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="cp-origin">Origin city</Label>
        <Input id="cp-origin" value={originCity} onChange={(e) => setOriginCity(e.target.value)} placeholder="Boston, MA" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cp-meet">Meeting point</Label>
        <Input id="cp-meet" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="South Station, Track 6" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cp-time">Departure time</Label>
        <Input id="cp-time" type="datetime-local" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="cp-note">Note</Label>
        <Textarea
          id="cp-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Splitting gas, no smoking, etc."
        />
      </div>
      <Button onClick={submit} disabled={create.isPending} className="w-full min-h-11">
        Publish carpool
      </Button>
    </Card>
  );
}
