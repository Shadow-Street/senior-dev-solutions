import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import apiClient from "@/lib/apiClient";
import { debounce } from "lodash";

export default function AddStockModal({ open, onClose, watchlist, onAddStock }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchedStocks, setSearchedStocks] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useMemo(
    () => debounce(async (term) => {
      if (term.length < 2) {
        setSearchedStocks([]);
        return;
      }

      setIsSearching(true);
      try {
        const response = await apiClient.get('/stocks/search-live', { params: { q: term } });
        const results = response.data || [];

        // Filter out stocks already in watchlist
        const watchlistSymbols = new Set((watchlist || []).map(w => w.symbol || w.stock_symbol));
        const filteredResults = results.filter(stock => !watchlistSymbols.has(stock.symbol));

        setSearchedStocks(filteredResults);
      } catch (error) {
        console.error('Error searching stocks:', error);
        setSearchedStocks([]);
      } finally {
        setIsSearching(false);
      }
    }, 400),
    [watchlist]
  );

  useEffect(() => {
    // Clear search results when modal is closed
    if (!open) {
      setSearchTerm("");
      setSearchedStocks([]);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [open, debouncedSearch]);

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    debouncedSearch(term);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Stock to Watchlist</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              placeholder="Search stocks by name or symbol..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
            {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
          </div>

          {/* Stock List */}
          <div className="flex-1 overflow-y-auto space-y-2 p-1">
            {isSearching ? (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-slate-500">Searching...</p>
              </div>
            ) : searchTerm.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Type at least 2 characters to search stocks</p>
              </div>
            ) : searchedStocks.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No stocks found matching your search</p>
              </div>
            ) : (
              searchedStocks.map((stock, index) => (
                <div key={stock.symbol || index} className="flex items-center justify-between p-3 rounded-lg border hover:bg-slate-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div>
                        <h4 className="font-semibold">{stock.symbol}</h4>
                        <p className="text-sm text-slate-500">{stock.name}</p>
                      </div>
                      {stock.exchange && <Badge variant="outline" className="text-xs">
                        {stock.exchange}
                      </Badge>}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => onAddStock(stock)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}