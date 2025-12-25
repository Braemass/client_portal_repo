import type { Metadata } from 'next';
import ProjectPageClient from '@/components/ProjectPageClient';

type RouteParams = { id: string };

// Next 15: `params` is a Promise — await in a server component
export default async function ProjectPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { id } = await params;
  return <ProjectPageClient id={id} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Project ${id} • StrandAerial`,
    description: `Details and deliverables for project ${id}.`,
  };
}

