// src/components/LessonsLearnedReport.tsx

import React, { useEffect, useState } from 'react';
import { collection, getDocs } from "firebase/firestore";
import { db } from '../firebase/config.js';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Lesson {
    id: string;
    problemDescription: string;
    futureRecommendations: string;
    registrationDate: any;
}

export function LessonsLearnedReport() {
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchLessons = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "lessons_learned"));
                const lessonsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
                setLessons(lessonsData);
            } catch (error) {
                console.error("Error fetching lessons learned for report:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLessons();
    }, []);

    const formatDate = (date: any) => {
        if (!date?.seconds) return 'N/A';
        return new Date(date.seconds * 1000).toLocaleDateString('en-CA');
    };

    if (isLoading) {
        return <p className="text-center p-4">Loading lessons learned report...</p>;
    }

    if (lessons.length === 0) {
        return <p className="text-center p-4">No lessons learned found.</p>;
    }

    return (
        <div className="space-y-4">
            {lessons.map(lesson => (
                <Card key={lesson.id}>
                    <CardHeader>
                        <CardTitle>Problem: {lesson.problemDescription}</CardTitle>
                        <CardDescription>
                            Registered on: {formatDate(lesson.registrationDate)}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="font-semibold">Recommendation:</p>
                        <p className="text-gray-700">{lesson.futureRecommendations}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}