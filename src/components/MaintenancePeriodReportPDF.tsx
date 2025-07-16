import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { AdvancedMaintenanceTask } from '@/types/maintenance';

// --- Font Registration (Optional, for better character support) ---
// To support special characters, you might need to register a font.
// Font.register({ family: 'Noto Sans', src: 'https://path-to-your-font/NotoSans-Regular.ttf' });

const styles = StyleSheet.create({
  page: { 
    padding: 30, 
    fontSize: 9, 
    fontFamily: 'Helvetica', 
    color: '#333' 
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#1a97f5',
    paddingBottom: 10,
    marginBottom: 20,
  },
  headerTitle: { 
    fontSize: 18, 
    color: '#1a97f5', 
    fontWeight: 'bold' 
  },
  headerInfo: { 
    fontSize: 10, 
    textAlign: 'right', 
    color: '#666' 
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#0056b3',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    paddingBottom: 3,
  },
  table: { display: "flex", width: "auto", borderStyle: "solid", borderWidth: 1, borderColor: '#e0e0e0' },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  tableColHeader: { backgroundColor: '#f4f4f4', padding: 5, borderStyle: "solid", borderWidth: 0, borderRightWidth: 1, borderColor: '#e0e0e0' },
  tableCol: { padding: 5, borderStyle: "solid", borderWidth: 0, borderRightWidth: 1, borderColor: '#e0e0e0' },
  tableCellHeader: { fontSize: 9, fontWeight: 'bold' },
  tableCell: { fontSize: 8 },
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 20, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eaeaea' },
  summaryBox: { alignItems: 'center' },
  summaryValue: { fontSize: 12, fontWeight: 'bold', color: '#1a97f5' },
  summaryLabel: { fontSize: 8, color: '#666' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, textAlign: 'center', fontSize: 8, color: 'grey' },
});

const formatTimestamp = (ts: any) => {
  if (!ts || !ts.toDate) return 'N/A';
  return ts.toDate().toLocaleDateString();
};

interface MaintenancePeriodReportProps {
  tasks: AdvancedMaintenanceTask[];
  planName: string;
  assetName: string;
  periodLabel: string;
}

export const MaintenancePeriodReportPDF: React.FC<MaintenancePeriodReportProps> = ({ tasks, planName, assetName, periodLabel }) => {
  const totalCost = tasks.reduce((sum, task) => sum + (task.cost || 0), 0);
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <View><Text style={styles.headerTitle}>Maintenance Period Report</Text><Text style={{fontSize: 12}}>{planName}</Text></View>
          <View style={styles.headerInfo}><Text>Asset: {assetName}</Text><Text>Period: {periodLabel}</Text><Text>Generated: {new Date().toLocaleDateString()}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Tasks Summary</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={{...styles.tableColHeader, width: '30%'}}><Text style={styles.tableCellHeader}>Description</Text></View>
            <View style={{...styles.tableColHeader, width: '14%'}}><Text style={styles.tableCellHeader}>Due Date</Text></View>
            <View style={{...styles.tableColHeader, width: '14%'}}><Text style={styles.tableCellHeader}>Status</Text></View>
            <View style={{...styles.tableColHeader, width: '14%'}}><Text style={styles.tableCellHeader}>Assigned To</Text></View>
            <View style={{...styles.tableColHeader, width: '14%'}}><Text style={styles.tableCellHeader}>Duration (m)</Text></View>
            <View style={{...styles.tableColHeader, width: '14%', borderRightWidth: 0}}><Text style={styles.tableCellHeader}>Cost ($)</Text></View>
          </View>
          {tasks.map(task => (
            <View key={task.id} style={styles.tableRow}>
              <View style={{...styles.tableCol, width: '30%'}}><Text style={styles.tableCell}>{task.taskDescription}</Text></View>
              <View style={{...styles.tableCol, width: '14%'}}><Text style={styles.tableCell}>{formatTimestamp(task.dueDate)}</Text></View>
              <View style={{...styles.tableCol, width: '14%'}}><Text style={styles.tableCell}>{task.status}</Text></View>
              <View style={{...styles.tableCol, width: '14%'}}><Text style={styles.tableCell}>{task.assignedToName || 'Unassigned'}</Text></View>
              <View style={{...styles.tableCol, width: '14%'}}><Text style={styles.tableCell}>{task.timer.totalDuration}</Text></View>
              <View style={{...styles.tableCol, width: '14%', borderRightWidth: 0}}><Text style={styles.tableCell}>{(task.cost || 0).toFixed(2)}</Text></View>
            </View>
          ))}
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}><Text style={styles.summaryValue}>{tasks.length}</Text><Text style={styles.summaryLabel}>Total Tasks</Text></View>
          <View style={styles.summaryBox}><Text style={styles.summaryValue}>{completedTasks}</Text><Text style={styles.summaryLabel}>Completed</Text></View>
          <View style={styles.summaryBox}><Text style={styles.summaryValue}>${totalCost.toFixed(2)}</Text><Text style={styles.summaryLabel}>Total Cost</Text></View>
        </View>

        <Text style={styles.footer} fixed>Generated by MaintenancePro App - Page <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} /></Text>
      </Page>
    </Document>
  );
};
