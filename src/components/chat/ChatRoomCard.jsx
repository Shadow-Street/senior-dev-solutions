
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Calendar, BarChart, Circle, MoreVertical, Trash2, Edit, Crown, Shield, MessageSquare, Lock, Share2 } from "lucide-react";
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSubscription } from "@/components/hooks/useSubscription";
import PremiumAccessOverlay from "../common/PremiumAccessOverlay";

export default function ChatRoomCard({ room, onDelete, onEdit, user, onRoomClick, isLocked = false, onShare }) {
    const onlineNow = room.onlineNow ?? Math.floor(room.participant_count / 4) + Math.floor(Math.random() * 5);
    const avgActiveMembers = room.avgActiveMembers ?? Math.floor(room.participant_count * 0.75);

    const subscriptionContext = useSubscription();

    const isAdmin = user && ['admin', 'super_admin'].includes(user.app_role);
    const isCreator = user && (room.created_by === user.email || room.created_by === user.id);
    const canEditDelete = isCreator || isAdmin;

    const isPremium = room.is_premium || room.room_type === 'premium' || room.room_type === 'premium_admin';
    const hasPremiumAccess = subscriptionContext?.hasPremiumAccess?.();
    const hasAccess = isAdmin || !isPremium || hasPremiumAccess;

    const handleDeleteClick = (e) => {
        e.stopPropagation();
        if (onDelete) {
            onDelete(room);
        }
    };

    const handleEditClick = (e) => {
        e.stopPropagation();
        if (onEdit) {
            onEdit(room);
        }
    };

    const getRoomTypeSubheading = () => {
        switch (room.room_type) {
            case "stock_specific":
                return "Stock Specific";
            case "general":
                return "General Discussion";
            case "sector":
                return "Sector Discussion";
            case "admin":
                return "Admin Announcements";
            case "premium":
                return "Premium Room";
            case "premium_admin":
                return "Premium Admin";
            default:
                return null;
        }
    };

    const subheading = getRoomTypeSubheading();
    const isAdminRoom = room.room_type === 'admin' || room.room_type === 'premium_admin' || room.admin_only_post;
    const isStockSpecific = room.room_type === 'stock_specific';

    // Check if stock symbol badge is redundant (if room name contains the stock symbol)
    const isStockSymbolRedundant = room.stock_symbol &&
        room.name.toUpperCase().includes(room.stock_symbol.toUpperCase());

    // Simple light gradient backgrounds - DIFFERENT for Admin vs Premium
    // Renamed and modified to only return background styles, as per outline structure
    const getCardGradient = () => {
        if (isPremium && isAdminRoom) {
            // Premium Admin - Purple gradient
            return "bg-gradient-to-br from-white to-surface-2";
        } else if (isAdminRoom) {
            // Admin Only - Blue gradient (DIFFERENT from premium)
            return "bg-gradient-to-br from-white to-surface-2";
        } else if (isPremium) {
            // Premium - Purple gradient
            return "bg-gradient-to-br from-white to-surface-2";
        }
        return "bg-white";
    };

    // Different decorative corner colors for Admin vs Premium
    const getCornerGradient = () => {
        if (isPremium && !isAdminRoom) {
            return "from-protocall-grape to-protocall-blue"; // Premium: Purple-Pink
        } else if (isAdminRoom && !isPremium) {
            return "from-protocall-blue to-protocall-blue"; // Admin: Blue-Cyan
        } else if (isPremium && isAdminRoom) {
            return "from-protocall-grape to-protocall-blue"; // Both: Purple-Indigo
        }
        return "from-protocall-grape to-protocall-blue"; // Default for non-special or if logic needs default
    };

    return (
        <Card
            className={`${getCardGradient()} group/room relative flex h-full cursor-pointer flex-col border border-transparent shadow-sm
                transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20
                hover:ring-2 hover:ring-primary/25 motion-reduce:transform-none motion-reduce:transition-none
                ${!hasAccess ? 'overflow-hidden' : ''}`}
            onClick={() => hasAccess && onRoomClick(room)}
        >
            {!hasAccess && (
                <PremiumAccessOverlay
                    title="Premium Room"
                    message="Join the inner circle of successful traders. Subscribe to access this room."
                />
            )}
            {/* Decorative corner gradient for premium/admin */}
            {(isPremium || isAdminRoom) && (
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${getCornerGradient()} opacity-10 rounded-full transform translate-x-16 -translate-y-16 pointer-events-none`}></div>
            )}

            <CardHeader className="relative pb-3 flex-none">
                {isLocked && (
                    <div className="absolute top-4 right-4 p-2 bg-primary rounded-full z-10">
                        <Lock className="w-4 h-4 text-white" />
                    </div>
                )}

                {/* ✅ Three-dot menu for creators/admins */}
                {canEditDelete && !isLocked && (
                    <div className="absolute top-4 right-4 z-10">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {onEdit && (
                                    <DropdownMenuItem onClick={handleEditClick}>
                                        <Edit className="w-4 h-4 mr-2 text-primary" />
                                        Edit Room
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleDeleteClick} className="text-sell-muted-foreground">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Room
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                    {/* Premium Badge */}
                    {isPremium && (
                        <Badge className="bg-primary hover:bg-primary text-white border-0">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                        </Badge>
                    )}

                    {/* Admin Badge */}
                    {isAdminRoom && (
                        <Badge className="bg-primary hover:bg-primary text-white border-0">
                            <Shield className="w-3 h-3 mr-1" />
                            Admin Only
                        </Badge>
                    )}

                    {/* Live Badge */}
                    {onlineNow > 0 && (
                        <Badge className="bg-buy-muted text-buy-muted-foreground hover:bg-buy-muted border-0">
                            <Circle className="w-2 h-2 mr-1 fill-current" />
                            {onlineNow} Live
                        </Badge>
                    )}

                    {/* Stock Symbol Badge - Only show if NOT redundant */}
                    {room.stock_symbol && !isStockSymbolRedundant && (
                        <Badge variant="secondary" className="bg-surface-2 text-subtle">
                            {room.stock_symbol}
                        </Badge>
                    )}
                </div>

                {/* Room Name */}
                {isStockSpecific ? (
                    <h3 className="text-xl font-bold text-foreground line-clamp-1 mb-1">
                        {room.name}
                    </h3>
                ) : (
                    <h3 className="text-xl font-bold text-foreground line-clamp-1 mb-1">{room.name}</h3>
                )}

                {/* Subheading */}
                {subheading && (
                    <p className="text-sm font-medium text-muted-foreground">{subheading}</p>
                )}
            </CardHeader>

            <CardContent className="flex-1 flex flex-col justify-between pt-0 space-y-4">
                {/* Description */}
                <div>
                    {room.description && (
                        <p className="text-subtle text-sm line-clamp-3 leading-relaxed mb-4">
                            {room.description}
                        </p>
                    )}

                    {/* Stats */}
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1.5">
                            <Users className="w-4 h-4" />
                            <span>{room.participant_count || 0} members</span>
                        </div>

                        {avgActiveMembers > 0 && (
                            <div className="flex items-center gap-1.5">
                                <BarChart className="w-4 h-4" />
                                <span>{avgActiveMembers} active</span>
                            </div>
                        )}
                    </div>

                    {/* Created Date */}
                    {room.created_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Created {format(new Date(room.created_at), 'MMM d, yyyy')}</span>
                        </div>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-divider">
                    <Button
                        className="h-10 w-full rounded-xl border-0 bg-primary font-semibold text-primary-foreground shadow-sm
                                   transition-all duration-200 hover:bg-protocall-grape hover:shadow-md
                                   disabled:opacity-60"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!isLocked) onRoomClick(room);
                        }}
                        disabled={isLocked}
                    >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Join Conversation
                    </Button>

                    <Button
                        variant="outline"
                        className="w-full border-border text-subtle hover:bg-surface-2 hover:text-foreground rounded-xl font-medium h-10"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onShare) {
                                onShare(room);
                            } else {
                                // Fallback functionality
                                const url = window.location.href; // In real app, might append ?room=id
                                navigator.clipboard.writeText(`${url}?room=${room.id}`);
                                alert("Link copied to clipboard!"); // Fallback for now, or just leave it.
                            }
                        }}
                    >
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
