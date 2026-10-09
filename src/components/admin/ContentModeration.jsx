import React, { useState } from 'react';
import { Shield, Check, X, AlertTriangle, Eye, EyeOff, Lock, Trash2, Filter, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Poll } from '@/lib/apiClient';
import ChatRoomManagement from '@/components/superadmin/ChatRoomManagement';

export default function ContentModeration({ polls = [], onPollUpdated, currentUser }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'flagged'

    const handleAction = async (action, item) => {
        try {
            if (action === 'delete') {
                if (!confirm(`Delete poll "${item.title}"?`)) return;
                await Poll.delete(item.id);
                toast.success("Content deleted.");
            } else if (action === 'toggle-premium') {
                await Poll.update(item.id, { is_premium: !item.is_premium });
                toast.success(`Content marked as ${!item.is_premium ? 'Premium' : 'Standard'}`);
            } else if (action === 'toggle-active') {
                await Poll.update(item.id, { is_active: !item.is_active });
                toast.success(`Content ${!item.is_active ? 'Activated' : 'Suspended'}`);
            }
            onPollUpdated();
        } catch (error) {
            console.error(`Failed to ${action} content:`, error);
            toast.error(`Failed to perform action.`);
        }
    };

    const toggleSelection = (id) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleBulkAction = async (action) => {
        if (!confirm(`Apply action "${action}" to ${selectedItems.length} items?`)) return;

        // Mock implementation for bulk - loop through
        // In real app, backend should support bulk endpoint
        try {
            const promises = selectedItems.map(id => {
                if (action === 'delete') return Poll.delete(id);
                return Promise.resolve();
            });
            await Promise.all(promises);
            toast.success("Bulk action completed.");
            setSelectedItems([]);
            onPollUpdated();
        } catch (err) {
            toast.error("Some actions failed.");
        }
    };

    const filteredPolls = polls.filter(p => {
        if (filterStatus === 'active') return p.is_active;
        if (filterStatus === 'flagged') return p.reports > 0; // Mock field
        return true;
    });

    return (
        <Card className="h-full border-0 shadow-none bg-transparent">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-sell to-hold bg-clip-text text-transparent inline-flex items-center gap-2">
                        <Shield className="w-6 h-6 text-hold" />
                        Content Police
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">Review, flag, and manage user-generated content.</p>
                </div>

                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    <Button
                        variant={filterStatus === 'all' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterStatus('all')}
                    >All</Button>
                    <Button
                        variant={filterStatus === 'active' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterStatus('active')}
                    >Active</Button>
                    <Button
                        variant={filterStatus === 'flagged' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilterStatus('flagged')}
                        className="text-sell-muted-foreground hover:bg-sell-muted hover:text-sell-muted-foreground"
                    >Flagged</Button>
                </div>
            </div>

            {/* Bulk Toolbar */}
            {selectedItems.length > 0 && (
                <div className="bg-protocall-ink text-white p-3 rounded-lg flex justify-between items-center mb-4 animate-in slide-in-from-top-2">
                    <span className="text-sm font-medium px-2">{selectedItems.length} items selected</span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                            <Trash2 className="w-4 h-4 mr-2" /> Delete All
                        </Button>
                    </div>
                </div>
            )}

            {/* Content Tabs */}
            <Tabs defaultValue="polls" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="polls">Polls</TabsTrigger>
                    <TabsTrigger value="chatrooms">Chat Rooms</TabsTrigger>
                </TabsList>

                <TabsContent value="polls" className="mt-4 space-y-4">
                    {filteredPolls.map(poll => (
                        <div key={poll.id} className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center hover:shadow-md transition-shadow group">
                            <input
                                type="checkbox"
                                className="mt-1.5 md:mt-0 rounded border-border text-hold-muted-foreground focus:ring-hold/30 w-4 h-4"
                                checked={selectedItems.includes(poll.id)}
                                onChange={() => toggleSelection(poll.id)}
                            />

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={poll.is_active ? 'default' : 'secondary'} className={poll.is_active ? 'bg-buy-muted text-buy-muted-foreground' : ''}>
                                        {poll.is_active ? 'Active' : 'Closed'}
                                    </Badge>
                                    {poll.is_premium && (
                                        <Badge className="bg-premium-muted text-protocall-premium-text border-protocall-premium-light">
                                            Premium
                                        </Badge>
                                    )}
                                    <span className="text-xs text-muted-foreground font-mono">ID: {poll.id.slice(0, 8)}</span>
                                </div>
                                <h4 className="font-semibold text-foreground truncate">{poll.title}</h4>
                                <p className="text-sm text-muted-foreground truncate">{poll.stock_symbol ? `$${poll.stock_symbol}` : 'General'} • Created {new Date(poll.created_at).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction('toggle-premium', poll)}
                                    title={poll.is_premium ? "Remove Premium" : "Make Premium"}
                                >
                                    {poll.is_premium ? <Lock className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
                                </Button>

                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleAction('toggle-active', poll)}
                                    className={poll.is_active ? 'text-sell-muted-foreground hover:text-sell-muted-foreground hover:bg-sell-muted' : 'text-buy-muted-foreground hover:text-buy-muted-foreground hover:bg-buy-muted'}
                                    title={poll.is_active ? "Suspend" : "Activate"}
                                >
                                    {poll.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </Button>

                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-sell-muted-foreground hover:bg-sell-muted hover:text-sell-muted-foreground"
                                    onClick={() => handleAction('delete', poll)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                    {filteredPolls.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Layers className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>No polls found matching filters.</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="chatrooms">
                    <ChatRoomManagement user={currentUser} />
                </TabsContent>
            </Tabs>
        </Card>
    );
}
