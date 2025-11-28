import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, TrendingUp, Users, Shield, Star } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';

export default function PortfolioManagers() {
  const [user, setUser] = useState(null);
  const [pms, setPMs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Load all approved PMs
      const approvedPMs = await base44.entities.PortfolioManager.filter({ status: 'approved' });
      setPMs(approvedPMs);
    } catch (error) {
      console.error('Error loading PMs:', error);
      toast.error('Failed to load Portfolio Managers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyAsClient = async (pmId) => {
    if (!user) {
      toast.error('Please log in to apply as a client');
      return;
    }

    toast.info('PM client application coming soon! Contact the PM directly for now.');
  };

  const filteredPMs = pms.filter(pm =>
    pm.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pm.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pm.specialization?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <Briefcase className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Portfolio Managers</h1>
              <p className="text-blue-100 mt-1">SEBI Registered Portfolio Managers</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Search by name, company, or specialization..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* PMs Grid */}
        {filteredPMs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Portfolio Managers Found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPMs.map((pm) => (
              <Card key={pm.id} className="hover:shadow-xl transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {pm.display_name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pm.display_name}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">{pm.company_name}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          SEBI Registered
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {pm.bio && (
                    <p className="text-sm text-gray-600 line-clamp-2">{pm.bio}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600 mb-1" />
                      <p className="text-xs text-blue-600">Clients</p>
                      <p className="text-lg font-bold text-blue-900">{pm.total_clients || 0}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <TrendingUp className="w-4 h-4 text-green-600 mb-1" />
                      <p className="text-xs text-green-600">Total AUM</p>
                      <p className="text-lg font-bold text-green-900">
                        ₹{pm.total_aum ? (pm.total_aum / 100000).toFixed(1) : 0}L
                      </p>
                    </div>
                  </div>

                  {pm.specialization && pm.specialization.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-700 mb-2">Specialization:</p>
                      <div className="flex flex-wrap gap-2">
                        {pm.specialization.slice(0, 3).map((spec, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-sm">
                      <p className="text-gray-600">Performance Fee</p>
                      <p className="font-semibold text-gray-900">{pm.performance_fee_percentage}%</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-600">Experience</p>
                      <p className="font-semibold text-gray-900">{pm.experience_years || 0} years</p>
                    </div>
                  </div>

                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => handleApplyAsClient(pm.id)}
                  >
                    Become a Client
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}