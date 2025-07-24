// ==============================
// src/components/MOTAllReportPDF.tsx
// ==============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Use a simpler approach with system fonts that support Arabic
// Since external fonts are causing loading issues, we'll use direction and alignment only

interface MOT {
  id: string;
  workOrderNumber: string;
  station: string;
  technicianName: string;
  totalCost: number;
  issueDate: any;
  status: 'Pending' | 'Completed' | 'Invoiced';
  description: string;
  invoiceNumber: string;
  cargoWiseCw: string;
}

interface Props {
  mots: MOT[];
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#1a97f5',
  },
  headerLeft: {
    flexDirection: 'column',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  logo: {
    width: 50,
    height: 50,
    marginRight: 12,
  },
  headerTextContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 11,
    color: '#666',
  },
  companyInfo: {
    fontSize: 9,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 8,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCard: {
    width: '23%',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a97f5',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 8,
    color: '#64748b',
    textAlign: 'center',
  },
  table: {
    display: 'flex',
    width: '100%',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 8,
    color: '#374151',
    paddingRight: 5,
  },
  tableCellHeader: {
    fontSize: 8,
    fontWeight: 'bold',
    color: '#111827',
    paddingRight: 5,
  },
  colMot: { width: '12%' },
  colDescription: { width: '25%' },
  colTechnician: { width: '15%' },
  colDate: { width: '12%' },
  colInvoice: { width: '12%' },
  colCost: { width: '10%', textAlign: 'right' },
  colStatus: { width: '10%' },
  colCargo: { width: '10%' },
  badge: {
    padding: '2px 6px',
    borderRadius: 3,
    fontSize: 7,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  badgePending: {
    backgroundColor: '#f59e0b',
  },
  badgeCompleted: {
    backgroundColor: '#10b981',
  },
  badgeInvoiced: {
    backgroundColor: '#1a97f5',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: '#6b7280',
  },
  statusBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  statusCard: {
    width: '30%',
    padding: 8,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    border: '1px solid #e2e8f0',
    alignItems: 'center',
  },
  statusCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  statusLabel: {
    fontSize: 8,
    color: '#64748b',
  },
  costSummary: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 6,
    border: '1px solid #bae6fd',
    marginBottom: 15,
  },
  costSummaryTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0369a1',
    marginBottom: 5,
  },
  costSummaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0c4a6e',
    textAlign: 'center',
  },
});

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  if (date.seconds) {
    return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  }
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
};

const truncateText = (text: string, maxLength: number) => {
  if (!text) return 'N/A';
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
};

// Simple function to clean corrupted Arabic text
const cleanArabicText = (text: string): string => {
  if (!text) return 'N/A';
  
  // Check for corrupted characters (common patterns in corrupted Arabic)
  const hasCorruptedPattern = text.includes('!') || text.includes('*') || text.includes('(') || text.includes(')');
  const hasWeirdChars = /[^\u0020-\u007E\u0600-\u06FF\u0750-\u077F\s]/.test(text);
  
  if (hasCorruptedPattern || hasWeirdChars) {
    return 'Arabic Text'; // Simple clean placeholder
  }
  
  return text;
};

const StatusBadge = ({ status }: { status: string }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'Pending':
        return styles.badgePending;
      case 'Completed':
        return styles.badgeCompleted;
      case 'Invoiced':
        return styles.badgeInvoiced;
      default:
        return styles.badgePending;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle()]}>
      <Text>{status}</Text>
    </View>
  );
};

export const MOTAllReportPDF: React.FC<Props> = ({ mots }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate summary statistics
  const totalMots = mots.length;
  const pendingCount = mots.filter(mot => mot.status === 'Pending').length;
  const completedCount = mots.filter(mot => mot.status === 'Completed').length;
  const invoicedCount = mots.filter(mot => mot.status === 'Invoiced').length;
  const totalCost = mots.reduce((sum, mot) => sum + (mot.totalCost || 0), 0);

  const itemsPerPage = 25;
  const totalPages = Math.ceil(mots.length / itemsPerPage);

  const renderPage = (pageNumber: number) => {
    const startIndex = (pageNumber - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, mots.length);
    const pageMots = mots.slice(startIndex, endIndex);

    return (
      <Page key={pageNumber} size="A4" orientation="landscape" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>All MOTs Comprehensive Report</Text>
              <Text style={styles.subtitle}>Maintenance Order Tickets Overview</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyInfo}>Facility Management System</Text>
            <Text style={styles.companyInfo}>Generated: {currentDate}</Text>
            <Text style={styles.companyInfo}>Total MOTs: {totalMots}</Text>
          </View>
        </View>

        {/* Summary Section - Only on first page */}
        {pageNumber === 1 && (
          <>
            {/* Summary Cards */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary Overview</Text>
              <View style={styles.summaryCards}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryNumber}>{totalMots}</Text>
                  <Text style={styles.summaryLabel}>Total MOTs</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryNumber}>{pendingCount}</Text>
                  <Text style={styles.summaryLabel}>Pending</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryNumber}>{completedCount}</Text>
                  <Text style={styles.summaryLabel}>Completed</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryNumber}>{invoicedCount}</Text>
                  <Text style={styles.summaryLabel}>Invoiced</Text>
                </View>
              </View>
            </View>

            {/* Cost Summary */}
            <View style={styles.costSummary}>
              <Text style={styles.costSummaryTitle}>Total Project Value</Text>
              <Text style={styles.costSummaryAmount}>
                ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </>
        )}

        {/* MOTs Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MOTs Listing {totalPages > 1 ? `(Page ${pageNumber} of ${totalPages})` : ''}
          </Text>
          
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCellHeader, styles.colMot]}>MOT/WO#</Text>
              <Text style={[styles.tableCellHeader, styles.colDescription]}>Description</Text>
              <Text style={[styles.tableCellHeader, styles.colTechnician]}>Technician</Text>
              <Text style={[styles.tableCellHeader, styles.colDate]}>Issue Date</Text>
              <Text style={[styles.tableCellHeader, styles.colInvoice]}>Invoice #</Text>
              <Text style={[styles.tableCellHeader, styles.colCargo]}>Cargo CW</Text>
              <Text style={[styles.tableCellHeader, styles.colCost]}>Cost</Text>
              <Text style={[styles.tableCellHeader, styles.colStatus]}>Status</Text>
            </View>

            {/* Table Rows */}
            {pageMots.map((mot, index) => (
              <View 
                key={mot.id} 
                style={[
                  styles.tableRow,
                  index % 2 === 1 ? styles.tableRowAlt : {}
                ]}
              >
                <Text style={[styles.tableCell, styles.colMot]}>
                  {mot.workOrderNumber}
                </Text>
                <Text style={[styles.tableCell, styles.colDescription]}>
                  {truncateText(cleanArabicText(mot.description), 35)}
                </Text>
                <Text style={[styles.tableCell, styles.colTechnician]}>
                  {truncateText(cleanArabicText(mot.technicianName), 15)}
                </Text>
                <Text style={[styles.tableCell, styles.colDate]}>
                  {formatDate(mot.issueDate)}
                </Text>
                <Text style={[styles.tableCell, styles.colInvoice]}>
                  {mot.invoiceNumber || 'N/A'}
                </Text>
                <Text style={[styles.tableCell, styles.colCargo]}>
                  {mot.cargoWiseCw || 'N/A'}
                </Text>
                <Text style={[styles.tableCell, styles.colCost]}>
                  ${mot.totalCost.toLocaleString()}
                </Text>
                <View style={[styles.colStatus]}>
                  <StatusBadge status={mot.status} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Facility Management System - All MOTs Report</Text>
          <Text>Page {pageNumber} of {totalPages}</Text>
        </View>
      </Page>
    );
  };

  return (
    <Document>
      {Array.from({ length: totalPages }, (_, i) => renderPage(i + 1))}
    </Document>
  );
};