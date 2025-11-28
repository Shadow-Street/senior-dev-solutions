import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function EditMessageModal({ open, onClose, message, onSave }) {
  const [editedContent, setEditedContent] = useState(message?.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!editedContent.trim()) {
      setError('Message cannot be empty');
      return;
    }

    if (editedContent.trim() === message.content) {
      onClose();
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave(editedContent.trim());
      onClose();
    } catch (err) {
      setError('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Make changes to your message. Others will see an "edited" indicator.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Textarea
            value={editedContent}
            onChange={(e) => {
              setEditedContent(e.target.value);
              setError('');
            }}
            placeholder="Type your message..."
            className="min-h-[120px] resize-none"
            autoFocus
            disabled={isSaving}
          />

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mt-2 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4" />
              {error}
            </motion.div>
          )}

          <p className="text-xs text-slate-500 mt-2">
            {editedContent.length} / 2000 characters
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !editedContent.trim() || editedContent.length > 2000}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}