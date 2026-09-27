
import React, { useState, useEffect } from 'react';
import FundManagerLayout from '../components/layouts/FundManagerLayout';
import InvestorRequestsManager from '../components/superadmin/fundmanager/InvestorRequestsManager';
import KYCApprovalModal from '../components/superadmin/fundmanager/KYCApprovalModal';

// Assuming these are from a UI library like shadcn/ui
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

// Assuming these are from lucide-react
import { CheckCircle, Clock, XCircle, FileText, Eye, Users, Loader2 } from 'lucide-react';

// Mock API and data for demonstration purposes
const mockInvestorsData = [
  {
    id: 'inv1',
    full_name: 'Alice Johnson',
    investor_code: 'INV001',
    email: 'alice.johnson@example.com',
    mobile_number: '+919876543210',
    status: 'active',
    kyc_status: 'verified',
    total_invested: 1000000,
    current_value: 1200000,
  },
  {
    id: 'inv2',
    full_name: 'Bob Williams',
    investor_code: 'INV002',
    email: 'bob.williams@example.com',
    mobile_number: '+919876512345',
    status: 'active',
    kyc_status: 'pending',
    total_invested: 500000,
    current_value: 450000,
  },
  {
    id: 'inv3',
    full_name: 'Charlie Brown',
    investor_code: 'INV003',
    email: 'charlie.brown@example.com',
    mobile_number: '+919876598765',
    status: 'inactive',
    kyc_status: 'failed',
    total_invested: 200000,
    current_value: 200000,
  },
  {
    id: 'inv4',
    full_name: 'Diana Prince',
    investor_code: 'INV004',
    email: 'diana.prince@example.com',
    mobile_number: '+919876500000',
    status: 'active',
    kyc_status: 'pending',
    total_invested: 1500000,
    current_value: 1650000,
  },
  {
    id: 'inv5',
    full_name: 'Eve Adams',
    investor_code: 'INV005',
    email: 'eve.adams@example.com',
    mobile_number: '+919876511223',
    status: 'active',
    kyc_status: 'verified',
    total_invested: 800000,
    current_value: 900000,
  },
];

const mockWalletsData = {
  'inv1': { id: 'wlt1', balance: 50000, currency: 'INR', kyc_documents: [{ id: 'doc1', name: 'PAN Card', status: 'verified', url: '#' }] },
  'inv2': { id: 'wlt2', balance: 10000, currency: 'INR', kyc_documents: [{ id: 'doc2', name: 'Aadhar Card', status: 'pending', url: '#' }, { id: 'doc3', name: 'Bank Statement', status: 'pending', url: '#' }] },
  'inv3': { id: 'wlt3', balance: 0, currency: 'INR', kyc_documents: [{ id: 'doc4', name: 'PAN Card', status: 'failed', url: '#' }] },
  'inv4': { id: 'wlt4', balance: 75000, currency: 'INR', kyc_documents: [{ id: 'doc5', name: 'Passport', status: 'pending', url: '#' }] },
  'inv5': { id: 'wlt5', balance: 25000, currency: 'INR', kyc_documents: [{ id: 'doc6', name: 'Driving License', status: 'verified', url: '#' }] },
};

// Mock API call
const api = {
  getInvestors: () => new Promise(resolve => setTimeout(() => resolve(mockInvestorsData), 500)),
  getWallets: () => new Promise(resolve => setTimeout(() => resolve(mockWalletsData), 300)),
};

// Placeholder for InvestorDetailsModal
const InvestorDetailsModal = ({ isOpen, onClose, investor }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Investor Details: {investor?.full_name}</h2>
        <p>Email: {investor?.email}</p>
        <p>Mobile: {investor?.mobile_number}</p>
        <p>KYC Status: {investor?.kyc_status}</p>
        {/* Add more details here */}
        <div className="mt-6 text-right">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};


export default function FundManager_Investors() {
  const [investors, setInvestors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [selectedInvestorForKYC, setSelectedInvestorForKYC] = useState(null);
  const [showInvestorDetailsModal, setShowInvestorDetailsModal] = useState(false);
  const [selectedInvestorForDetails, setSelectedInvestorForDetails] = useState(null);
  const [wallets, setWallets] = useState({}); // Stores wallet data indexed by investor ID

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const investorsData = await api.getInvestors();
      const walletsData = await api.getWallets();
      setInvestors(investorsData);
      setWallets(walletsData);
    } catch (err) {
      setError("Failed to load investor data.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReviewKYC = (investor) => {
    setSelectedInvestorForKYC(investor);
    setShowKYCModal(true);
  };

  const handleKYCUpdate = () => {
    setShowKYCModal(false);
    setSelectedInvestorForKYC(null);
    loadData(); // Refresh data after KYC update
  };

  const handleViewDetails = (investor) => {
    setSelectedInvestorForDetails(investor);
    setShowInvestorDetailsModal(true);
  };

  const getKYCStatusBadge = (status) => {
    switch (status) {
      case 'verified':
        return (
          <Badge className="bg-buy-muted text-buy-muted-foreground border-buy/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-hold-muted text-hold-muted-foreground border-hold/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-sell-muted text-sell-muted-foreground border-sell/30">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-surface-2 text-foreground border-border">
            <Clock className="w-3 h-3 mr-1" />
            Unknown
          </Badge>
        );
    }
  };

  return (
    <FundManagerLayout activePage="investors">
      <div className="p-8">
        {/* This section remains from the original file */}
        <h2 className="text-2xl font-bold mb-6">Investor Requests</h2>
        <InvestorRequestsManager />

        <div className="mt-12">
          {/* Header cards would typically go here */}
          {/* Placeholder for header cards if they were part of the "keep existing code" */}
          {/* Example:
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-4 shadow-sm">Card 1</Card>
            <Card className="p-4 shadow-sm">Card 2</Card>
            <Card className="p-4 shadow-sm">Card 3</Card>
            <Card className="p-4 shadow-sm">Card 4</Card>
          </div>
          */}

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">All Investors</CardTitle>
            </CardHeader>
            <CardContent>
              {error && <div className="text-sell text-center py-4">{error}</div>}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-protocall-blue" />
                </div>
              ) : investors.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <p>No investors found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-divider">
                    <thead className="bg-surface-2">
                      <tr>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Investor</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-subtle">Contact</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-subtle">Status</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-subtle">KYC Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-subtle">Total Invested</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-subtle">Current Value</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-subtle">P&L</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-subtle">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-divider">
                      {investors.map((investor) => {
                        const profitLoss = (investor.current_value || 0) - (investor.total_invested || 0);
                        const profitLossPercent = investor.total_invested > 0
                          ? ((profitLoss / investor.total_invested) * 100).toFixed(2)
                          : 0;

                        return (
                          <tr key={investor.id} className="hover:bg-surface-2">
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div>
                                <p className="font-medium text-sm text-foreground">{investor.full_name}</p>
                                <p className="text-xs text-muted-foreground">{investor.investor_code}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="text-sm">
                                <p className="text-subtle">{investor.email}</p>
                                <p className="text-muted-foreground">{investor.mobile_number}</p>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <Badge className={
                                investor.status === 'active'
                                  ? 'bg-buy-muted text-buy-muted-foreground border-buy/30'
                                  : 'bg-surface-2 text-foreground border-border'
                              }>
                                {investor.status}
                              </Badge>
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              {getKYCStatusBadge(investor.kyc_status)}
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <p className="font-semibold text-sm text-foreground">
                                ₹{(investor.total_invested || 0).toLocaleString('en-IN')}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <p className="font-semibold text-sm text-foreground">
                                ₹{(investor.current_value || 0).toLocaleString('en-IN')}
                              </p>
                            </td>
                            <td className="py-4 px-4 text-right whitespace-nowrap">
                              <div className={profitLoss >= 0 ? 'text-buy-muted-foreground' : 'text-sell-muted-foreground'}>
                                <p className="font-bold text-sm">
                                  {profitLoss >= 0 ? '+' : ''}₹{profitLoss.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs">
                                  ({profitLoss >= 0 ? '+' : ''}{profitLossPercent}%)
                                </p>
                              </div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <div className="flex gap-2 justify-center">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReviewKYC(investor)}
                                  className="border-2 border-protocall-premium-light text-protocall-premium-text hover:bg-premium-muted"
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Review KYC
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewDetails(investor)}
                                  className="border-2 border-protocall-premium-light text-protocall-blue hover:bg-premium-muted"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Investor Details Modal */}
        {selectedInvestorForDetails && (
          <InvestorDetailsModal
            investor={selectedInvestorForDetails}
            isOpen={showInvestorDetailsModal}
            onClose={() => {
              setShowInvestorDetailsModal(false);
              setSelectedInvestorForDetails(null);
            }}
          />
        )}

        {/* KYC Approval Modal */}
        {selectedInvestorForKYC && (
          <KYCApprovalModal
            investor={selectedInvestorForKYC}
            wallet={wallets[selectedInvestorForKYC.id]} // Pass the specific wallet for the investor
            isOpen={showKYCModal}
            onClose={() => {
              setShowKYCModal(false);
              setSelectedInvestorForKYC(null);
            }}
            onUpdate={handleKYCUpdate}
          />
        )}
      </div>
    </FundManagerLayout>
  );
}
