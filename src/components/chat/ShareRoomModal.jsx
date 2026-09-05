import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, Instagram, Phone, X, Facebook } from "lucide-react";
import { toast } from "sonner";

export default function ShareRoomModal({ open, onClose, room, shareLink: propShareLink, shareText: propShareText, title = "Share Chat Room" }) {
    const [copied, setCopied] = useState(false);

    // If neither room nor explicit link is provided, return null (or handle gracefully)
    if (!room && !propShareLink) return null;

    // Construct the share link - preferably use prop, fallback to room
    const shareLink = propShareLink || `${window.location.origin}/chatroom?id=${room?.id}`;
    const defaultText = room ? `Join me in the ${room.name} chat room on ProtoCall!` : "Check out this link on ProtoCall!";
    const shareText = propShareText || defaultText;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareLink);
        setCopied(true);
        toast.success("Link copied to clipboard!");
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSocialShare = (platform) => {
        let url = "";

        switch (platform) {
            case "whatsapp":
                url = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareLink)}`;
                break; // Facebook share is usually just the URL
            case "facebook":
                url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`;
                break;
            case "instagram":
                // Instagram doesn't have a direct web share link for posts/stories easily, usually just copies link
                // But we can just copy link and show toast or try to open app if mobile
                handleCopy();
                toast.info("Link copied! Open Instagram to share.");
                return;
            default:
                return;
        }

        if (url) {
            window.open(url, "_blank");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white rounded-2xl gap-0">
                <DialogHeader className="p-6 pb-2">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
                        {/* Close button is usually handled by Dialog primitive but we can ensure visual consistency if needed, 
                            though ui/dialog usually adds one. Let's trust the default close or add a custom one if the screenshot shows one specifically.
                            The screenshot has a generic X. ui/dialog has one. */}
                    </div>
                </DialogHeader>

                <div className="p-6 pt-2 space-y-6">
                    {/* Link Section */}
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-900">Share Link</label>
                        <div className="flex gap-2">
                            <Input
                                value={shareLink}
                                readOnly
                                className="bg-slate-50 border-slate-200 text-slate-600 focus-visible:ring-blue-500"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={handleCopy}
                                className="border-slate-200 hover:bg-slate-50 shrink-0"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                            </Button>
                        </div>
                    </div>

                    {/* Social Media Section */}
                    <div className="space-y-3">
                        <label className="text-sm font-semibold text-slate-900">Share on Social Media</label>
                        <div className="grid grid-cols-1 gap-3">
                            {/* Instagram - Gradient */}
                            <Button
                                onClick={() => handleSocialShare('instagram')}
                                className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:opacity-90 text-white font-semibold h-11 border-0"
                            >
                                <Instagram className="w-5 h-5 mr-2" />
                                Instagram
                            </Button>

                            {/* WhatsApp - Green */}
                            <Button
                                onClick={() => handleSocialShare('whatsapp')}
                                className="w-full bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold h-11 border-0"
                            >
                                <Phone className="w-5 h-5 mr-2 fill-current" /> {/* Using Phone as generic or MessageCircle if avail */}
                                WhatsApp
                            </Button>

                            {/* Facebook - Blue */}
                            <Button
                                onClick={() => handleSocialShare('facebook')}
                                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white font-semibold h-11 border-0"
                            >
                                <Facebook className="w-5 h-5 mr-2 fill-current" />
                                Facebook
                            </Button>
                        </div>
                    </div>

                    {/* Instagram Instructions - Blue Box */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                        <h4 className="font-semibold text-blue-900 mb-2 text-sm">How to share on Instagram:</h4>
                        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                            <li>Click "Instagram" button above to copy the link</li>
                            <li>Open Instagram and create a new Story or Post</li>
                            <li>Add text and paste the link</li>
                            <li>Your followers can click the link to join!</li>
                        </ol>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
