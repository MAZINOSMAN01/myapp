// src/components/LessonsLearnedReport.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function LessonsLearnedReport({ data }: { data: any[] }) {
  const formatDate = (date: any) => !date?.seconds ? 'N/A' : new Date(date.seconds * 1000).toLocaleDateString('en-CA');
  return (
    <div className="space-y-4">
      {data.map(lesson => (
        <Card key={lesson.id}>
          <CardHeader>
            <CardTitle>{lesson.problemDescription}</CardTitle>
            <CardDescription>Registered on: {formatDate(lesson.registrationDate)}</CardDescription>
          </CardHeader>
          <CardContent><p>{lesson.futureRecommendations}</p></CardContent>
        </Card>
      ))}
    </div>
  );
}