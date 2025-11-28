import React, { useState, useEffect } from 'react';
import { User, Subscription, RoomSubscription, VIPCustomization } from '@/api/entities';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, DollarSign, Shield, Star, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

export default function RoomAccessControl({ room, children }) {
  const [user, setUser] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [vipFeatures, setVipFeatures] = useState(null);
  const [accessReason, setAccessReason] = useState('');

  useEffect(() => {
    checkAccess();
  }, [room]);

  const checkAccess = async () => {
    setIsLoading(true);
    try {
      const currentUser = await User.me().catch(() => null);
      setUser(currentUser);

      if (!currentUser) {
        setHasAccess(false);
        setAccessReason('login_required');
        setIsLoading(false);
        return;
      }

      // Admins always have access
      if (['admin', 'super_admin'].includes(currentUser.app_role)) {
        setHasAccess(true);
        setAccessReason('admin');
        setIsLoading(false);
        return;
      }

      // Check if user is in whitelist (for private rooms)
      if (room.is_private && room.allowed_user_ids) {
        if (room.allowed_user_ids.includes(currentUser.id)) {
          setHasAccess(true);
          setAccessReason('whitelisted');
          setIsLoading(false);
          return;
        } else {
          setHasAccess(false);
          setAccessReason('not_whitelisted');
          setIsLoading(false);
          return;
        }
      }

      // Check paid room subscription
      if (room.is_paid) {
        const roomSub = await RoomSubscription.filter({
          user_id: currentUser.id,
          room_id: room.id,
          status: 'active'
        }).catch(() => []);

        if (roomSub.length > 0) {
          setHasAccess(true);
          setAccessReason('paid_subscriber');
          setIsLoading(false);
          return;
        } else {
          setHasAccess(false);
          setAccessReason('payment_required');
          setIsLoading(false);
          return;
        }
      }

      // Check premium tier
      if (room.is_premium && room.premium_tier) {
        const userSub = await Subscription.filter({
          user_id: currentUser.id,
          status: 'active'
        }).catch(() => []);

        if (userSub.length > 0) {
          const tierLevels = { basic: 1, premium: 2, vip: 3 };
          const userTier = userSub[0].plan_type;
          const requiredTier = room.premium_tier;

          if (tierLevels[userTier] >= tierLevels[requiredTier]) {
            setHasAccess(true);
            setAccessReason('subscription_tier');
            
            // Load VIP features if room has them enabled
            if (room.vip_features_enabled) {
              const vipCustom = await VIPCustomization.filter({
                user_id: currentUser.id,
                '$or': [
                  { room_id: room.id },
                  { room_id: null }
                ]
              }).catch(() => []);
              
              if (vipCustom.length > 0) {
                setVipFeatures(vipCustom[0]);
              }
            }
          } else {
            setHasAccess(false);
            setAccessReason('upgrade_required');
          }
        } else {
          setHasAccess(false);
          setAccessReason('subscription_required');
        }
      } else {
        // Public room
        setHasAccess(true);
        setAccessReason('public');
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(false);
      setAccessReason('error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center mx-auto mb-6">
              {accessReason === 'payment_required' && <DollarSign className="w-10 h-10 text-white" />}
              {accessReason === 'not_whitelisted' && <Lock className="w-10 h-10 text-white" />}
              {accessReason === 'upgrade_required' && <Crown className="w-10 h-10 text-white" />}
              {accessReason === 'subscription_required' && <Star className="w-10 h-10 text-white" />}
              {accessReason === 'login_required' && <Shield className="w-10 h-10 text-white" />}
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              {accessReason === 'payment_required' && 'Paid Room Access Required'}
              {accessReason === 'not_whitelisted' && 'Private Room'}
              {accessReason === 'upgrade_required' && 'Upgrade Required'}
              {accessReason === 'subscription_required' && 'Premium Access Required'}
              {accessReason === 'login_required' && 'Login Required'}
            </h2>

            <p className="text-slate-600 mb-6">
              {accessReason === 'payment_required' && `This room requires a ₹${room.room_price}/month subscription to access exclusive content and discussions.`}
              {accessReason === 'not_whitelisted' && 'This is a private room. You need an invitation to join.'}
              {accessReason === 'upgrade_required' && `This room requires a ${room.premium_tier?.toUpperCase()} tier subscription.`}
              {accessReason === 'subscription_required' && 'This is a premium room. Subscribe to access exclusive features.'}
              {accessReason === 'login_required' && 'Please login to access this room.'}
            </p>

            {room.is_premium && room.premium_tier && (
              <div className="mb-6">
                <Badge className="bg-purple-100 text-purple-800 mb-3">
                  <Crown className="w-3 h-3 mr-1" />
                  {room.premium_tier?.toUpperCase()} TIER REQUIRED
                </Badge>
              </div>
            )}

            {accessReason === 'payment_required' && (
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700">
                <DollarSign className="w-4 h-4 mr-2" />
                Subscribe for ₹{room.room_price}/month
              </Button>
            )}

            {accessReason === 'not_whitelisted' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <Lock className="w-5 h-5 mx-auto mb-2 text-blue-600" />
                Contact the room administrator for an invitation
              </div>
            )}

            {(accessReason === 'upgrade_required' || accessReason === 'subscription_required') && (
              <Link to={createPageUrl("Subscription")}>
                <Button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to {room.premium_tier?.toUpperCase()}
                </Button>
              </Link>
            )}

            {accessReason === 'login_required' && (
              <Link to={createPageUrl("Profile")}>
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Shield className="w-4 h-4 mr-2" />
                  Login to Continue
                </Button>
              </Link>
            )}

            <Link to={createPageUrl("ChatRooms")}>
              <Button variant="outline" className="w-full mt-3">
                Back to Rooms
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render children with VIP features context
  return (
    <div className={vipFeatures?.ad_free ? 'vip-ad-free' : ''}>
      {vipFeatures && (
        <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-slate-900">VIP Features Active</span>
          </div>
          <div className="flex gap-2 mt-2">
            {vipFeatures.custom_badge && (
              <Badge style={{ 
                backgroundColor: vipFeatures.custom_badge.color,
                color: 'white',
                border: 'none'
              }}>
                {vipFeatures.custom_badge.icon} {vipFeatures.custom_badge.name}
              </Badge>
            )}
            {vipFeatures.message_effects?.length > 0 && (
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                {vipFeatures.message_effects.length} Effects
              </Badge>
            )}
            {vipFeatures.ad_free && (
              <Badge className="bg-green-100 text-green-800">
                Ad-Free
              </Badge>
            )}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}