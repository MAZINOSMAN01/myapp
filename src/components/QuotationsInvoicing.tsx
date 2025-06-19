
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Search, Plus, FileText, CheckCircle, Clock, AlertCircle, Eye } from "lucide-react";

export function QuotationsInvoicing() {
  const quotations = [
    {
      id: "QUO-2024-001",
      supplier: "CleanCorp Supplies",
      description: "Cleaning materials - Q1",
      amount: 2850.00,
      status: "Pending Approval",
      requestedBy: "Maria Rodriguez",
      requestDate: "2024-01-15",
      approver: "John Manager",
      items: [
        { name: "All-purpose cleaner", quantity: 50, unit: "bottles", price: 12.50 },
        { name: "Microfiber cloths", quantity: 200, unit: "pieces", price: 3.25 }
      ]
    },
    {
      id: "QUO-2024-002", 
      supplier: "TechMaint Solutions",
      description: "HVAC maintenance parts",
      amount: 4200.00,
      status: "Approved",
      requestedBy: "John Smith",
      requestDate: "2024-01-12",
      approver: "Sarah Manager",
      items: [
        { name: "Air filters", quantity: 20, unit: "pieces", price: 45.00 },
        { name: "Fan belts", quantity: 8, unit: "pieces", price: 125.00 }
      ]
    },
    {
      id: "QUO-2024-003",
      supplier: "Safety First Equipment",
      description: "Safety equipment renewal",
      amount: 1650.00,
      status: "Rejected",
      requestedBy: "Mike Wilson",
      requestDate: "2024-01-10",
      approver: "John Manager",
      items: [
        { name: "Safety harness", quantity: 5, unit: "pieces", price: 180.00 },
        { name: "Hard hats", quantity: 15, unit: "pieces", price: 55.00 }
      ]
    }
  ];

  const invoices = [
    {
      id: "INV-2024-001",
      quotationId: "QUO-2024-002",
      supplier: "TechMaint Solutions",
      amount: 4200.00,
      status: "Paid",
      invoiceDate: "2024-01-18",
      dueDate: "2024-02-17",
      paidDate: "2024-01-19"
    },
    {
      id: "INV-2024-002",
      quotationId: "QUO-2023-087",
      supplier: "Office Supplies Co",
      amount: 890.00,
      status: "Outstanding",
      invoiceDate: "2024-01-16",
      dueDate: "2024-02-15",
      paidDate: null
    }
  ];

  const getQuotationStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "bg-green-100 text-green-800";
      case "Pending Approval":
        return "bg-yellow-100 text-yellow-800";
      case "Rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800";
      case "Outstanding":
        return "bg-orange-100 text-orange-800";
      case "Overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quotations & Invoicing</h1>
          <p className="text-gray-500">Manage quotations, approvals, and invoices</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Quotation Request
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">5</div>
              <p className="text-sm text-gray-500">Pending Approval</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">$12,340</div>
              <p className="text-sm text-gray-500">Approved This Month</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">18</div>
              <p className="text-sm text-gray-500">Active Invoices</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">3</div>
              <p className="text-sm text-gray-500">Overdue Payments</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search quotations and invoices..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quotations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Quotations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {quotations.map((quote) => (
              <div key={quote.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{quote.description}</h4>
                    <p className="text-sm text-gray-500">{quote.id} • {quote.supplier}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">${quote.amount.toLocaleString()}</p>
                    <Badge className={getQuotationStatusColor(quote.status)}>
                      {quote.status}
                    </Badge>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-medium text-gray-600">Requested By</p>
                    <p className="text-sm">{quote.requestedBy}</p>
                    <p className="text-xs text-gray-500">{quote.requestDate}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-600">Approver</p>
                    <p className="text-sm">{quote.approver}</p>
                  </div>
                  
                  <div>
                    <p className="text-xs font-medium text-gray-600">Items</p>
                    <p className="text-sm">{quote.items.length} items</p>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-3 w-3 mr-1" />
                    View Details
                  </Button>
                  {quote.status === "Pending Approval" && (
                    <>
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 border-red-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{invoice.id}</h4>
                    <p className="text-sm text-gray-500">From: {invoice.supplier}</p>
                    <p className="text-sm text-gray-500">Quotation: {invoice.quotationId}</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">${invoice.amount.toLocaleString()}</p>
                    <Badge className={getInvoiceStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                  
                  <div className="text-right text-sm text-gray-500">
                    <p>Invoice: {invoice.invoiceDate}</p>
                    <p>Due: {invoice.dueDate}</p>
                    {invoice.paidDate && <p className="text-green-600">Paid: {invoice.paidDate}</p>}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <FileText className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    {invoice.status === "Outstanding" && (
                      <Button variant="outline" size="sm" className="text-green-600 border-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
