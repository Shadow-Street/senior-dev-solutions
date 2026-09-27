import React from "react";
import { Shield, ShieldCheck, ShieldAlert, Star, AlertTriangle, Badge as BadgeIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function TrustScoreBadge({ score, showScore = true, size = "sm" }) {
  const trustScore = score === undefined ? 50 : score;
  
  const getTrustTier = (score) => {
    if (score >= 80) return "trusted";
    if (score >= 40) return "neutral";
    return "low";
  };
  
  const getTrustConfig = (tier) => {
    switch (tier) {
      case "trusted":
        return {
          icon: ShieldCheck,
          bgColor: "bg-buy-muted",
          textColor: "text-buy-muted-foreground",
          borderColor: "border-buy/30",
          iconColor: "text-buy-muted-foreground",
          label: "Trusted",
          showStar: true
        };
      case "neutral":
        return {
          icon: BadgeIcon,
          bgColor: "bg-hold-muted",
          textColor: "text-hold-muted-foreground",
          borderColor: "border-hold/30",
          iconColor: "text-hold-muted-foreground",
          label: "Neutral",
          showStar: false
        };
      case "low":
        return {
          icon: ShieldAlert,
          bgColor: "bg-sell-muted",
          textColor: "text-sell-muted-foreground",
          borderColor: "border-sell/30",
          iconColor: "text-sell-muted-foreground",
          label: "Low Trust",
          showStar: false
        };
      default:
        return {
          icon: BadgeIcon,
          bgColor: "bg-surface-2",
          textColor: "text-foreground",
          borderColor: "border-border",
          iconColor: "text-subtle",
          label: "Unrated",
          showStar: false
        };
    }
  };
  
  const getSizeConfig = (size) => {
    switch (size) {
      case "xs":
        return {
          iconSize: "w-3 h-3",
          starSize: "w-2 h-2",
          textSize: "text-xs",
          padding: "px-1.5 py-0.5",
          gap: "gap-1"
        };
      case "sm":
        return {
          iconSize: "w-3.5 h-3.5",
          starSize: "w-2.5 h-2.5",
          textSize: "text-xs",
          padding: "px-2 py-1",
          gap: "gap-1"
        };
      case "md":
        return {
          iconSize: "w-4 h-4",
          starSize: "w-3 h-3",
          textSize: "text-sm",
          padding: "px-2.5 py-1.5",
          gap: "gap-1.5"
        };
      default:
        return getSizeConfig("sm");
    }
  };
  
  const tier = getTrustTier(trustScore);
  const config = getTrustConfig(tier);
  const sizeConfig = getSizeConfig(size);
  const IconComponent = config.icon;
  
  return (
    <Badge 
      variant="outline" 
      className={`
        ${config.bgColor} 
        ${config.textColor} 
        ${config.borderColor}
        ${sizeConfig.padding}
        ${sizeConfig.gap}
        ${sizeConfig.textSize}
        font-semibold
        flex items-center
        border
        transition-all duration-200
        hover:shadow-sm
      `}
      title={`Trust Score: ${Math.round(trustScore)} - ${config.label}`}
    >
      <div className="relative flex items-center">
        <IconComponent className={`${sizeConfig.iconSize} ${config.iconColor}`} />
        {config.showStar && (
          <Star 
            className={`${sizeConfig.starSize} text-hold absolute -top-0.5 -right-0.5 fill-current`} 
          />
        )}
      </div>
      {showScore && (
        <span className="ml-1 font-bold">
          {Math.round(trustScore)}
        </span>
      )}
    </Badge>
  );
}