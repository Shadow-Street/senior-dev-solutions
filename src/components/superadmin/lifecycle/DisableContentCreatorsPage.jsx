import React, { useState } from 'react';
import { FeatureConfig } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DisableContentCreatorsPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [foundIssues, setFoundIssues] = useState([]);

  const handleFixDuplicates = async () => {
    setIsProcessing(true);
    setFoundIssues([]);
    
    try {
      const allFeatures = await FeatureConfig.list();
      const issues = [];
      
      // Find all finfluencer-related entries
      const finfluencerEntries = allFeatures.filter(f => 
        f.feature_key?.toLowerCase().includes('content_creator') ||
        f.feature_key?.toLowerCase().includes('finfluencer') ||
        f.feature_name?.toLowerCase().includes('content creator') ||
        f.route_path?.toLowerCase().includes('finfluencer')
      );

      for (const feature of finfluencerEntries) {
        // Case 1: Disable duplicate "content_creators" entries (keep only "finfluencers")
        if (feature.feature_key !== 'finfluencers' && 
            (feature.feature_key?.toLowerCase().includes('content_creator') ||
             feature.feature_key?.toLowerCase().includes('finfluencer'))) {
          await FeatureConfig.update(feature.id, {
            visible_to_users: false,
            status: 'disabled'
          });
          issues.push(`Disabled duplicate: ${feature.feature_name} (${feature.feature_key})`);
        }
        
        // Case 2: Rename "Content Creators" to "Finfluencers" in the main entry
        if (feature.feature_key === 'finfluencers' && 
            feature.feature_name === 'Content Creators') {
          await FeatureConfig.update(feature.id, {
            feature_name: 'Finfluencers'
          });
          issues.push(`Renamed: "Content Creators" → "Finfluencers"`);
        }
      }

      setFoundIssues(issues);
      setIsComplete(true);
      
      if (issues.length > 0) {
        toast.success(`Fixed ${issues.length} issue(s). Please refresh the page.`);
      } else {
        toast.info('No issues found. Navigation is clean!');
      }
    } catch (error) {
      console.error('Error fixing duplicates:', error);
      toast.error('Failed to fix issues: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="border-hold/30 bg-hold-muted">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-hold-muted-foreground">
          <AlertCircle className="w-5 h-5" />
          Fix Navigation Issues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-hold-muted-foreground">
          <p className="mb-2">This tool will:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Remove duplicate "Content Creators" / "Finfluencers" pages</li>
            <li>Rename "Content Creators" to "Finfluencers" in navigation</li>
            <li>Ensure clean, non-redundant sidebar navigation</li>
          </ul>
        </div>

        {isComplete && foundIssues.length > 0 && (
          <div className="bg-buy-muted border border-buy/30 rounded-lg p-3">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-buy-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold text-buy-muted-foreground">Issues Fixed:</p>
                <ul className="text-sm text-buy-muted-foreground space-y-1 mt-2">
                  {foundIssues.map((issue, idx) => (
                    <li key={idx}>✓ {issue}</li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-sm text-buy-muted-foreground font-medium mt-3">
              Please refresh your browser to see the updated navigation.
            </p>
          </div>
        )}

        {isComplete && foundIssues.length === 0 && (
          <div className="bg-premium-muted border border-protocall-premium-light rounded-lg p-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-protocall-ink/75" />
            <span className="text-sm text-protocall-blue">No issues found. Navigation is already clean!</span>
          </div>
        )}

        <Button 
          onClick={handleFixDuplicates}
          disabled={isProcessing || isComplete}
          className="w-full bg-hold hover:bg-hold"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Scanning and Fixing...
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Fixed Successfully
            </>
          ) : (
            <>
              <AlertCircle className="w-4 h-4 mr-2" />
              Fix Navigation Issues
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}