import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { AdvancedMaintenanceTask } from '@/types/maintenance';

// --- Font Registration (Optional, for better character support) ---
// Download a font that supports Arabic/special characters, e.g., Noto Sans
// Font.register({
//   family: 'Noto Sans',
//   src: 'https://fonts.gstatic.com/s/notosans/v27/o-0IIpQlx3QUlC5A4PNr5TRG.ttf'
// });

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica', // or 'Noto Sans' if registered
    color: '#333',
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
  logo: {
    width: 80,
    height: 40,
    // Important: Replace with the actual path to your logo
    // The image must be accessible, e.g., hosted or a base64 string
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a97f5',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    paddingBottom: 5,
    color: '#0056b3'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 10,
  },
  fieldContainer: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  fieldLabel: {
    fontWeight: 'bold',
    width: 120,
  },
  fieldValue: {
    flex: 1,
  },
  notesSection: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#eaeaea'
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: 'grey',
  },
  badge: {
    padding: '4px 8px',
    borderRadius: 4,
    color: '#fff',
    fontSize: 9,
  },
  badgeCompleted: {
    backgroundColor: '#28a745',
  },
  badgeInProgress: {
    backgroundColor: '#007bff',
  },
  badgePending: {
    backgroundColor: '#6c757d',
  },
  badgeHigh: {
    backgroundColor: '#dc3545',
  },
  badgeMedium: {
    backgroundColor: '#ffc107',
    color: '#333'
  },
  badgeLow: {
    backgroundColor: '#17a2b8',
  }
});

const getStatusBadgeStyle = (status: string) => {
  if (status === 'Completed') return styles.badgeCompleted;
  if (status === 'In Progress') return styles.badgeInProgress;
  return styles.badgePending;
};

const getPriorityBadgeStyle = (priority: string) => {
  if (priority === 'High' || priority === 'Critical') return styles.badgeHigh;
  if (priority === 'Medium') return styles.badgeMedium;
  return styles.badgeLow;
}

const formatTimestamp = (ts: any) => {
  if (!ts || !ts.toDate) return 'N/A';
  return ts.toDate().toLocaleString();
};

interface MaintenanceReportPDFProps {
  task: AdvancedMaintenanceTask;
  assetName?: string;
  planName?: string;
}

export const MaintenanceReportPDF: React.FC<MaintenanceReportPDFProps> = ({ task, assetName, planName }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        {/* 
          ⭐ IMPORTANT: Replace this with your company's logo.
          You can use a URL or a base64 encoded image.
        */}
        <Image style={styles.logo} src="https://i.imgur.com/S9Y8EaA.png" />
        <Text style={styles.headerText}>Maintenance Task Report</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Summary</Text>
        <View style={styles.grid}>
          <View style={styles.gridItem}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Plan Name:</Text>
              <Text style={styles.fieldValue}>{planName || 'N/A'}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Asset Name:</Text>
              <Text style={styles.fieldValue}>{assetName || 'N/A'}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Maintenance Type:</Text>
              <Text style={styles.fieldValue}>{task.type}</Text>
            </View>
             <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Assigned To:</Text>
              <Text style={styles.fieldValue}>{task.assignedToName || 'Unassigned'}</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Status:</Text>
              <Text style={{...styles.badge, ...getStatusBadgeStyle(task.status)}}>{task.status}</Text>
            </View>
             <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Priority:</Text>
              <Text style={{...styles.badge, ...getPriorityBadgeStyle(task.priority)}}>{task.priority}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Due Date:</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(task.dueDate)}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Completed At:</Text>
              <Text style={styles.fieldValue}>{formatTimestamp(task.completedAt)}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Task Description</Text>
        <Text>{task.taskDescription}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance & Cost</Text>
        <View style={styles.grid}>
           <View style={styles.gridItem}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Estimated Duration:</Text>
              <Text style={styles.fieldValue}>{task.estimatedDuration || 'N/A'} minutes</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Actual Time Taken:</Text>
              <Text style={styles.fieldValue}>{task.timer.totalDuration} minutes</Text>
            </View>
          </View>
          <View style={styles.gridItem}>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Cost:</Text>
              <Text style={styles.fieldValue}>${task.cost || 0}</Text>
            </View>
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Quality Rating:</Text>
              <Text style={styles.fieldValue}>{task.qualityRating ? `${task.qualityRating} / 5` : 'Not Rated'}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Technician Notes</Text>
        <View style={styles.notesSection}>
          {task.notes && task.notes.length > 0 ? (
            task.notes.map(note => (
              <View key={note.id} style={{marginBottom: 5, borderBottomWidth: 1, borderColor: '#ddd', paddingBottom: 5}}>
                <Text style={{fontSize: 8, color: '#666'}}>By: {note.createdBy} at {formatTimestamp(note.createdAt)}</Text>
                <Text>{note.text}</Text>
              </View>
            ))
          ) : (
            <Text>No notes were recorded for this task.</Text>
          )}
        </View>
      </View>

      <Text style={styles.footer} fixed>
        Generated on {new Date().toLocaleDateString()} by MaintenancePro App - Page {' '}
        <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Text>
    </Page>
  </Document>
);