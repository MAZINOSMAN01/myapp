// src/utils/firebase-data-adapter.ts
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/firebase/config'
import type { SpaceLocation, LocationStructure, SpaceType, MaintenancePriority } from '@/types/space-management'

// نوع البيانات الموجودة في Firebase
interface FirebaseSpaceData {
  id: string
  building: string
  floor: number
  space: string
  label: string
  [key: string]: any
}

export class FirebaseDataAdapter {
  
  // تحويل البيانات من Firebase إلى نظام Space Management
  static convertFirebaseToSpaceLocation(firebaseData: FirebaseSpaceData): SpaceLocation {
    const structure: LocationStructure = {
      building: firebaseData.building,
      floor: firebaseData.floor,
      space: firebaseData.space,
      label: firebaseData.label
    }

    const locationCode = `${structure.building}-FLOOR${structure.floor}-${structure.space.replace(/\s/g, '-')}`
    const displayName = `${structure.building} FLOOR ${structure.floor} ${structure.space}`
    
    const spaceType = this.determineSpaceType(structure.space, structure.label)
    
    return {
      id: firebaseData.id,
      locationCode,
      displayName,
      structure,
      spaceType,
      status: 'Available',
      area: this.estimateAreaFromSpace(structure.space, structure.label),
      capacity: this.estimateCapacity(structure.space, structure.label),
      department: structure.label,
      maintenancePriority: 'Medium',
      cleaningFrequency: this.determineCleaningFrequency(spaceType),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: 'migration',
      updatedBy: 'migration'
    }
  }

  // تحديد نوع المساحة
  private static determineSpaceType(space: string, label: string): SpaceType {
    const spaceUpper = space.toUpperCase()
    const labelUpper = label.toUpperCase()
    
    if (spaceUpper.includes('OFFICE')) return 'Office'
    if (spaceUpper.includes('MEETING') || spaceUpper.includes('CONFERENCE')) return 'Meeting Room'
    if (spaceUpper.includes('STORAGE') || spaceUpper.includes('STORE')) return 'Storage'
    if (spaceUpper.includes('ELECTRICAL') || spaceUpper.includes('ELECTRIC')) return 'Electrical Room'
    if (spaceUpper.includes('SERVER') || spaceUpper.includes('IT')) return 'Server Room'
    if (spaceUpper.includes('CAFETERIA') || spaceUpper.includes('KITCHEN')) return 'Cafeteria'
    if (spaceUpper.includes('BATHROOM') || spaceUpper.includes('TOILET')) return 'Bathroom'
    if (spaceUpper.includes('HALL') || spaceUpper.includes('CORRIDOR')) return 'Hallway'
    if (spaceUpper.includes('RECEPTION') || spaceUpper.includes('LOBBY')) return 'Reception'
    if (spaceUpper.includes('PARKING')) return 'Parking'
    
    if (labelUpper.includes('ADMIN')) return 'Office'
    if (labelUpper.includes('TECHNICAL')) return 'Electrical Room'
    if (labelUpper.includes('COMMON')) return 'Common Area'
    
    return 'Other'
  }

  // تقدير السعة
  private static estimateCapacity(space: string, label: string): number {
    const spaceUpper = space.toUpperCase()
    
    if (spaceUpper.includes('OFFICE')) {
      const match = space.match(/(\d+)/)
      if (match) {
        const officeNumber = parseInt(match[1])
        return officeNumber <= 10 ? 4 : 2
      }
      return 3
    }
    
    if (spaceUpper.includes('MEETING')) return 8
    if (spaceUpper.includes('CONFERENCE')) return 12
    if (spaceUpper.includes('STORAGE')) return 0
    if (spaceUpper.includes('ELECTRICAL')) return 1
    if (spaceUpper.includes('SERVER')) return 2
    if (spaceUpper.includes('CAFETERIA')) return 20
    if (spaceUpper.includes('BATHROOM')) return 3
    if (spaceUpper.includes('RECEPTION')) return 5
    
    return 1
  }

  // تقدير المساحة
  static estimateAreaFromSpace(space: string, label: string): number {
    const spaceUpper = space.toUpperCase()
    
    if (spaceUpper.includes('OFFICE')) {
      if (space.match(/\d+/)) {
        const num = parseInt(space.match(/\d+/)?.[0] || '0')
        return num <= 10 ? 25 : 15
      }
      return 20
    }
    
    if (spaceUpper.includes('MEETING')) return 30
    if (spaceUpper.includes('CONFERENCE')) return 50
    if (spaceUpper.includes('STORAGE')) return 12
    if (spaceUpper.includes('ELECTRICAL')) return 8
    if (spaceUpper.includes('SERVER')) return 15
    if (spaceUpper.includes('CAFETERIA')) return 100
    if (spaceUpper.includes('BATHROOM')) return 6
    if (spaceUpper.includes('RECEPTION')) return 40
    
    return 15
  }

  // تحديد تكرار التنظيف
  private static determineCleaningFrequency(spaceType: SpaceType): 'Daily' | 'Weekly' | 'Monthly' {
    switch (spaceType) {
      case 'Office':
      case 'Meeting Room':
      case 'Reception':
      case 'Bathroom':
        return 'Daily'
      case 'Cafeteria':
      case 'Common Area':
        return 'Daily'
      case 'Storage':
      case 'Electrical Room':
      case 'Server Room':
        return 'Weekly'
      default:
        return 'Weekly'
    }
  }

  // قراءة البيانات من Firebase وتحويلها
  static async loadAndConvertSpaces(collectionName: string = 'spaces'): Promise<SpaceLocation[]> {
    try {
      const snapshot = await getDocs(collection(db, collectionName))
      const firebaseSpaces: FirebaseSpaceData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirebaseSpaceData[]

      const convertedSpaces = firebaseSpaces.map(space => 
        this.convertFirebaseToSpaceLocation(space)
      )

      return convertedSpaces
    } catch (error) {
      console.error('Error loading spaces from Firebase:', error)
      throw error
    }
  }

  // حفظ البيانات المحولة
  static async saveConvertedSpaces(spaces: SpaceLocation[]): Promise<void> {
    try {
      const promises = spaces.map(space => 
        addDoc(collection(db, 'space_locations'), space)
      )
      
      await Promise.all(promises)
      console.log(`Successfully migrated ${spaces.length} spaces`)
    } catch (error) {
      console.error('Error saving converted spaces:', error)
      throw error
    }
  }

  // إنشاء بيانات تجريبية
  static async createSampleSpaces(): Promise<SpaceLocation[]> {
    const sampleData = [
      { building: 'A1', floor: 1, space: 'OFFICE 13', label: 'Admin' },
      { building: 'A1', floor: 1, space: 'MEETING ROOM 1', label: 'Meeting' },
      { building: 'A1', floor: 1, space: 'STORAGE 1', label: 'Storage' },
      { building: 'A1', floor: 2, space: 'OFFICE 21', label: 'Office' },
      { building: 'A1', floor: 2, space: 'ELECTRICAL ROOM', label: 'Technical' },
      { building: 'B1', floor: 1, space: 'CAFETERIA', label: 'Common' },
      { building: 'B1', floor: 1, space: 'BATHROOM 1', label: 'Bathroom' },
      { building: 'B1', floor: 2, space: 'SERVER ROOM', label: 'Technical' },
    ]

    return sampleData.map((data, index) => 
      this.convertFirebaseToSpaceLocation({ 
        id: `sample-${index}`, 
        ...data 
      })
    )
  }
}