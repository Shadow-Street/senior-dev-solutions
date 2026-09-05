import React, { useState, useEffect, useCallback } from "react";
import { Meeting } from "@/api/entities";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Video, VideoOff, Users, Clock, Settings, Edit } from "lucide-react";

export default function MeetingControls({ chatRoomId, stockSymbol, onMeetingStart, onMeetingEnd }) {
  const [activeMeeting, setActiveMeeting] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customMeetingUrl, setCustomMeetingUrl] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Load meeting
  const loadActiveMeeting = useCallback(async () => {
    if (!chatRoomId) return;
    try {
      const meetings = await Meeting.filter({
        chat_room_id: chatRoomId,
        status: 'active'
      }, '-start_time', 1).catch(() => []);

      if (meetings && meetings[0]) {
        setActiveMeeting(meetings[0]);
        setCustomMeetingUrl(meetings[0].meeting_url);
      } else {
        setActiveMeeting(null);
        setCustomMeetingUrl("");
      }
    } catch (error) {
      console.error("Error loading meeting:", error);
    }
  }, [chatRoomId]);

  useEffect(() => {
    loadActiveMeeting();
  }, [loadActiveMeeting]);

  const startMeeting = async () => {
    setIsLoading(true);
    try {
      // Use existing custom URL or generate one
      const finalUrl = customMeetingUrl || `https://meet.google.com/${Math.random().toString(36).substring(7)}`;

      const meetingData = {
        chat_room_id: chatRoomId,
        stock_symbol: stockSymbol || 'GENERAL',
        meeting_url: finalUrl,
        status: 'active',
        start_time: new Date().toISOString(),
        participant_count: 0,
        max_participants: 50
      };

      const meeting = await Meeting.create(meetingData);
      setActiveMeeting(meeting);
      setShowConfigModal(false);
      onMeetingStart && onMeetingStart(meeting);
    } catch (error) {
      console.error("Error starting meeting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMeetingLink = async () => {
    if (!activeMeeting) return;
    setIsUpdating(true);
    try {
      await Meeting.update(activeMeeting.id, {
        meeting_url: customMeetingUrl
      });
      setActiveMeeting(prev => ({ ...prev, meeting_url: customMeetingUrl }));
      setShowConfigModal(false);
    } catch (error) {
      console.error("Error updating meeting:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const endMeeting = async () => {
    if (!activeMeeting) return;
    setIsLoading(true);
    try {
      await Meeting.update(activeMeeting.id, {
        status: 'ended',
        end_time: new Date().toISOString()
      });
      setActiveMeeting(null);
      onMeetingEnd && onMeetingEnd();
    } catch (error) {
      console.error("Error ending meeting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {activeMeeting ? (
        <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="font-semibold">Meeting Active</p>
                  <p className="text-xs text-green-100 line-clamp-1 max-w-[200px]">
                    {activeMeeting.meeting_url}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-white hover:bg-white/20"
                  onClick={() => {
                    setCustomMeetingUrl(activeMeeting.meeting_url);
                    setShowConfigModal(true);
                  }}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => window.open(activeMeeting.meeting_url, '_blank')}
                  className="bg-white text-blue-600 hover:bg-blue-50"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Join
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={endMeeting}
                  disabled={isLoading}
                >
                  <VideoOff className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Video className="w-5 h-5 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-700">Start Live Meeting</p>
                  <p className="text-xs text-slate-500">Video call with room members</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setCustomMeetingUrl("");
                  setShowConfigModal(true);
                }}
                disabled={isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Video className="w-4 h-4 mr-2" />
                Start
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeMeeting ? "Update Meeting Link" : "Start New Meeting"}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label>Meeting URL</Label>
            <Input
              placeholder="https://meet.google.com/..."
              value={customMeetingUrl}
              onChange={(e) => setCustomMeetingUrl(e.target.value)}
              className="mt-2"
            />
            <p className="text-xs text-slate-500 mt-2">
              Paste your Google Meet, Zoom, or Teams link here. If empty, a random link will be generated.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            {activeMeeting ? (
              <Button onClick={updateMeetingLink} disabled={isUpdating}>Update Link</Button>
            ) : (
              <Button onClick={startMeeting} disabled={isLoading}>Start Meeting</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}