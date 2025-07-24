// ==============================
// src/components/MOTReportPDF.tsx
// ==============================

import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Use system fonts for better reliability - no external font loading issues

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
  mot: MOT;
}

const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    padding: 30,
    fontSize: 10,
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
    width: 60,
    height: 60,
    marginRight: 15,
  },
  headerTextContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
  },
  companyInfo: {
    fontSize: 10,
    color: '#666',
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#0056b3',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 8,
  },
  fullWidth: {
    width: '100%',
    marginBottom: 8,
  },
  fieldContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: 120,
    color: '#333',
  },
  fieldValue: {
    flex: 1,
    color: '#555',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 'bold',
    color: '#fff',
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
  descriptionBox: {
    border: '1px solid #e5e7eb',
    borderRadius: 4,
    padding: 15,
    backgroundColor: '#f9fafb',
    marginTop: 10,
  },
  descriptionText: {
    fontSize: 10,
    lineHeight: 1.4,
    color: '#374151',
  },
  costHighlight: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
    padding: 10,
    backgroundColor: '#ecfdf5',
    borderRadius: 6,
    textAlign: 'center',
    marginTop: 10,
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
  workflowSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    border: '1px solid #e2e8f0',
  },
  workflowTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 8,
  },
  workflowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  workflowIcon: {
    width: 8,
    height: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 4,
    marginRight: 8,
  },
  workflowText: {
    fontSize: 9,
    color: '#475569',
  },
});

const formatDate = (date: any) => {
  if (!date) return 'N/A';
  if (date.seconds) {
    return new Date(date.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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

export const MOTReportPDF: React.FC<Props> = ({ mot }) => {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Maintenance Order Ticket</Text>
            <Text style={styles.subtitle}>Comprehensive Report</Text>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.companyInfo}>Facility Management System</Text>
            <Text style={styles.companyInfo}>Generated: {currentDate}</Text>
            <Text style={styles.companyInfo}>MOT#{mot.workOrderNumber}</Text>
          </View>
        </View>

        {/* MOT Summary Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MOT Summary</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Work Order #:</Text>
                <Text style={styles.fieldValue}>{mot.workOrderNumber}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Station:</Text>
                <Text style={styles.fieldValue}>{mot.station}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Technician:</Text>
                <Text style={styles.fieldValue}>{cleanArabicText(mot.technicianName)}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Issue Date:</Text>
                <Text style={styles.fieldValue}>{formatDate(mot.issueDate)}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Invoice #:</Text>
                <Text style={styles.fieldValue}>{mot.invoiceNumber || 'Not Assigned'}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Cargo Wise CW:</Text>
                <Text style={styles.fieldValue}>{mot.cargoWiseCw || 'N/A'}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.fullWidth}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Status:</Text>
              <StatusBadge status={mot.status} />
            </View>
          </View>

          <Text style={styles.costHighlight}>
            Total Cost: ${mot.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </Text>
        </View>

        {/* Description Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work Description</Text>
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionText}>
              {cleanArabicText(mot.description) || 'No description provided for this maintenance order ticket.'}
            </Text>
          </View>
        </View>

        {/* Workflow and Process Section */}
        <View style={styles.workflowSection}>
          <Text style={styles.workflowTitle}>MOT Workflow Process</Text>
          <View style={styles.workflowItem}>
            <View style={styles.workflowIcon} />
            <Text style={styles.workflowText}>1. MOT Created and Assigned to Technician</Text>
          </View>
          <View style={styles.workflowItem}>
            <View style={styles.workflowIcon} />
            <Text style={styles.workflowText}>2. Work Order Executed by: {cleanArabicText(mot.technicianName)}</Text>
          </View>
          <View style={styles.workflowItem}>
            <View style={styles.workflowIcon} />
            <Text style={styles.workflowText}>3. Current Status: {mot.status}</Text>
          </View>
          {mot.invoiceNumber && (
            <View style={styles.workflowItem}>
              <View style={styles.workflowIcon} />
              <Text style={styles.workflowText}>4. Invoice Generated: {mot.invoiceNumber}</Text>
            </View>
          )}
        </View>

        {/* Additional Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>
          <View style={styles.grid}>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>MOT ID:</Text>
                <Text style={styles.fieldValue}>{mot.id}</Text>
              </View>
            </View>
            <View style={styles.gridItem}>
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Report Generated:</Text>
                <Text style={styles.fieldValue}>{currentDate}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Facility Management System - MOT Report</Text>
          <Text>Page 1 of 1</Text>
        </View>
      </Page>
    </Document>
  );
};