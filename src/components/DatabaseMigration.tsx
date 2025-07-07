// src/components/DatabaseMigration.tsx
// مكون مؤقت لتحديث البيانات الموجودة - يُستخدم مرة واحدة فقط

import React, { useState } from 'react';
import { collection, getDocs, updateDoc, doc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Database, CheckCircle } from "lucide-react";

export function DatabaseMigration() {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const { toast } = useToast();

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const migrateMaintenanceTasks = async () => {
    setCurrentStep('تحديث مهام الصيانة...');
    
    try {
      const snapshot = await getDocs(collection(db, 'maintenance_tasks'));
      const batch = writeBatch(db);
      let updateCount = 0;

      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const updates: any = {};

        // إضافة حقول الأرشفة إذا لم تكن موجودة
        if (data.archived === undefined) {
          updates.archived = false;
        }
        
        if (!data.archivedAt) {
          updates.archivedAt = null;
        }
        
        if (!data.archivedReason) {
          updates.archivedReason = null;
        }

        // إضافة تاريخ الإكمال إذا كانت المهمة مكتملة
        if (data.status === 'Completed' && !data.completedAt) {
          updates.completedAt = data.dueDate || Timestamp.now();
        }

        // إضافة حقول إضافية
        if (!data.priority) {
          updates.priority = 'Medium';
        }

        if (!data.estimatedDuration) {
          updates.estimatedDuration = null;
        }

        if (!data.actualDuration) {
          updates.actualDuration = null;
        }

        if (!data.completedBy) {
          updates.completedBy = null;
        }

        if (!data.notes) {
          updates.notes = '';
        }

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, 'maintenance_tasks', docSnapshot.id), updates);
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        addResult(`✅ تم تحديث ${updateCount} مهمة صيانة من أصل ${snapshot.size}`);
      } else {
        addResult(`ℹ️ جميع مهام الصيانة (${snapshot.size}) محدثة بالفعل`);
      }

    } catch (error) {
      addResult(`❌ خطأ في تحديث مهام الصيانة: ${error}`);
      throw error;
    }
  };

  const migrateWorkOrders = async () => {
    setCurrentStep('تحديث أوامر العمل...');
    
    try {
      const snapshot = await getDocs(collection(db, 'work_orders'));
      const batch = writeBatch(db);
      let updateCount = 0;

      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const updates: any = {};

        // إضافة تاريخ الإكمال
        if (data.status === 'Completed' && !data.completedAt) {
          updates.completedAt = data.updatedAt || data.dueDate || Timestamp.now();
        }

        // إضافة تاريخ الإغلاق
        if (['Closed', 'Cancelled'].includes(data.status) && !data.closedAt) {
          updates.closedAt = data.updatedAt || Timestamp.now();
        }

        // إضافة حقول مفقودة
        if (!data.completedBy) {
          updates.completedBy = null;
        }

        if (!data.actualCost) {
          updates.actualCost = data.estimatedCost || 0;
        }

        if (!data.resolution) {
          updates.resolution = '';
        }

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, 'work_orders', docSnapshot.id), updates);
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        addResult(`✅ تم تحديث ${updateCount} أمر عمل من أصل ${snapshot.size}`);
      } else {
        addResult(`ℹ️ جميع أوامر العمل (${snapshot.size}) محدثة بالفعل`);
      }

    } catch (error) {
      addResult(`❌ خطأ في تحديث أوامر العمل: ${error}`);
      throw error;
    }
  };

  const migrateIssues = async () => {
    setCurrentStep('تحديث سجل المشاكل...');
    
    try {
      const snapshot = await getDocs(collection(db, 'issue_logs'));
      const batch = writeBatch(db);
      let updateCount = 0;

      snapshot.docs.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const updates: any = {};

        // إضافة تاريخ الحل
        if (['Resolved', 'Closed'].includes(data.status) && !data.resolutionDate) {
          updates.resolutionDate = data.updatedAt || Timestamp.now();
        }

        // إضافة حقول مفقودة
        if (!data.priority) {
          updates.priority = 'Medium';
        }

        if (!data.reportedBy) {
          updates.reportedBy = '';
        }

        if (!data.category) {
          updates.category = 'General';
        }

        if (Object.keys(updates).length > 0) {
          batch.update(doc(db, 'issue_logs', docSnapshot.id), updates);
          updateCount++;
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        addResult(`✅ تم تحديث ${updateCount} مشكلة من أصل ${snapshot.size}`);
      } else {
        addResult(`ℹ️ جميع المشاكل (${snapshot.size}) محدثة بالفعل`);
      }

    } catch (error) {
      addResult(`❌ خطأ في تحديث سجل المشاكل: ${error}`);
      throw error;
    }
  };

  const createSystemCollections = async () => {
    setCurrentStep('إنشاء مجموعات النظام...');
    
    try {
      // إنشاء مجموعة إحصائيات النظام
      const systemStatsRef = doc(db, 'system_stats', 'general');
      await updateDoc(systemStatsRef, {
        lastMigration: Timestamp.now(),
        version: '2.0.0',
        features: ['archive_reports', 'advanced_search', 'auto_archiving']
      }).catch(async () => {
        // إذا لم يكن المستند موجوداً، أنشئه
        await updateDoc(systemStatsRef, {
          lastMigration: Timestamp.now(),
          version: '2.0.0',
          features: ['archive_reports', 'advanced_search', 'auto_archiving'],
          createdAt: Timestamp.now()
        });
      });

      addResult('✅ تم إنشاء مجموعة إحصائيات النظام');

      // إنشاء مجموعة التقارير المولدة
      const reportsRef = doc(db, 'generated_reports', 'sample');
      await updateDoc(reportsRef, {
        type: 'sample',
        createdAt: Timestamp.now(),
        description: 'Sample document to initialize collection'
      }).catch(async () => {
        await updateDoc(reportsRef, {
          type: 'sample',
          createdAt: Timestamp.now(),
          description: 'Sample document to initialize collection'
        });
      });

      addResult('✅ تم إنشاء مجموعة التقارير المولدة');

    } catch (error) {
      addResult(`❌ خطأ في إنشاء مجموعات النظام: ${error}`);
      throw error;
    }
  };

  const runMigration = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);
    
    try {
      addResult('🚀 بدء عملية التحديث...');
      
      // المرحلة 1: تحديث مهام الصيانة
      setProgress(20);
      await migrateMaintenanceTasks();
      
      // المرحلة 2: تحديث أوامر العمل
      setProgress(40);
      await migrateWorkOrders();
      
      // المرحلة 3: تحديث سجل المشاكل
      setProgress(60);
      await migrateIssues();
      
      // المرحلة 4: إنشاء مجموعات النظام
      setProgress(80);
      await createSystemCollections();
      
      setProgress(100);
      setCurrentStep('تم الانتهاء!');
      addResult('🎉 تم تحديث قاعدة البيانات بنجاح!');
      
      toast({
        title: "تم التحديث بنجاح",
        description: "قاعدة البيانات جاهزة الآن لميزات التقارير المتقدمة",
      });

    } catch (error) {
      addResult(`❌ فشل التحديث: ${error}`);
      toast({
        title: "فشل التحديث",
        description: "حدث خطأ أثناء تحديث قاعدة البيانات",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            تحديث قاعدة البيانات لدعم تقارير الأرشيف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">تحذير مهم</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  هذا التحديث سيضيف حقول جديدة للبيانات الموجودة. 
                  يُنصح بعمل نسخة احتياطية قبل البدء.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">ما سيتم تحديثه:</h4>
            <ul className="text-sm space-y-1 text-gray-600">
              <li>• إضافة حقول الأرشفة لمهام الصيانة</li>
              <li>• إضافة تواريخ الإكمال لأوامر العمل</li>
              <li>• إضافة تواريخ الحل للمشاكل</li>
              <li>• إنشاء مجموعات نظام جديدة</li>
              <li>• إضافة حقول مفقودة للبيانات الحالية</li>
            </ul>
          </div>

          {isRunning && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          <Button 
            onClick={runMigration} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? (
              <>جاري التحديث...</>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                بدء تحديث قاعدة البيانات
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>نتائج التحديث</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
              <pre className="text-sm whitespace-pre-wrap">
                {results.join('\n')}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}