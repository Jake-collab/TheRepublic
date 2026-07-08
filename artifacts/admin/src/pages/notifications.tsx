import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Send Notification</CardTitle>
          <CardDescription>Send an in-app notification to a specific user or broadcast to everyone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="userId">User ID (Leave blank to broadcast to all)</Label>
            <Input id="userId" placeholder="usr_..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" placeholder="Platform Update" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" placeholder="Type your message here..." rows={4} />
          </div>
          <div className="flex justify-end pt-2">
            <Button>Send Notification</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
