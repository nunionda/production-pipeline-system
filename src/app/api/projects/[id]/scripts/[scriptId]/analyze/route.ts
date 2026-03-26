import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { analyzeScript, type AnalyzedScene } from "@/lib/ai-analyzer";

// POST /api/projects/:id/scripts/:scriptId/analyze — start AI analysis
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; scriptId: string }> }
) {
  const { id, scriptId } = await params;

  const script = await db.script.findFirst({
    where: { id: scriptId, projectId: id },
  });

  if (!script) {
    return NextResponse.json(
      { error: "시나리오를 찾을 수 없습니다" },
      { status: 404 }
    );
  }

  if (!script.parsedText) {
    return NextResponse.json(
      { error: "시나리오 텍스트가 비어 있습니다" },
      { status: 400 }
    );
  }

  // Update status to processing
  await db.script.update({
    where: { id: scriptId },
    data: { analysisStatus: "PROCESSING" },
  });

  // Create or update analysis job
  const job = await db.analysisJob.upsert({
    where: {
      id: `${scriptId}-latest`,
    },
    create: {
      id: `${scriptId}-latest`,
      scriptId,
      status: "PROCESSING",
    },
    update: {
      status: "PROCESSING",
      error: null,
      retryCount: { increment: 1 },
    },
  });

  try {
    // Run AI analysis
    const result = await analyzeScript(script.parsedText);

    // Save scenes to database
    await saveAnalysisResults(id, scriptId, result.scenes);

    // Update job and script status
    await db.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        result: JSON.parse(JSON.stringify(result)),
      },
    });

    await db.script.update({
      where: { id: scriptId },
      data: { analysisStatus: "COMPLETED" },
    });

    return NextResponse.json({
      status: "completed",
      provider: result.provider,
      summary: result.summary,
    });
  } catch (error) {
    const errorMessage = (error as Error).message;

    await db.analysisJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: errorMessage },
    });

    await db.script.update({
      where: { id: scriptId },
      data: { analysisStatus: "FAILED" },
    });

    return NextResponse.json(
      { error: `AI 분석 실패: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * 분석 결과를 DB에 저장합니다.
 * 기존 씬이 있으면 삭제 후 재생성 (재분석 시).
 */
async function saveAnalysisResults(
  projectId: string,
  scriptId: string,
  scenes: AnalyzedScene[]
) {
  // Delete existing scenes for this script
  await db.scene.deleteMany({ where: { scriptId } });

  for (const scene of scenes) {
    // Create scene
    const dbScene = await db.scene.create({
      data: {
        scriptId,
        number: scene.number,
        intExt: scene.intExt,
        location: scene.location,
        timeOfDay: scene.timeOfDay,
        description: scene.description || null,
        sortOrder: scene.number,
      },
    });

    // Upsert project-level entities and create join records
    for (const char of scene.characters) {
      const character = await db.character.upsert({
        where: {
          projectId_name: { projectId, name: char.name },
        },
        create: {
          projectId,
          name: char.name,
          description: char.description || null,
        },
        update: {},
      });

      await db.sceneCharacter.create({
        data: {
          sceneId: dbScene.id,
          characterId: character.id,
          action: char.action || null,
        },
      });
    }

    for (const prop of scene.props) {
      const dbProp = await db.prop.upsert({
        where: {
          projectId_name: { projectId, name: prop.name },
        },
        create: { projectId, name: prop.name },
        update: {},
      });

      await db.sceneProp.create({
        data: {
          sceneId: dbScene.id,
          propId: dbProp.id,
          usage: prop.usage || null,
        },
      });
    }

    for (const costume of scene.costumes) {
      const dbCostume = await db.costume.upsert({
        where: {
          projectId_name: { projectId, name: `${costume.character}-${costume.description}` },
        },
        create: {
          projectId,
          name: `${costume.character}-${costume.description}`,
          character: costume.character,
        },
        update: {},
      });

      await db.sceneCostume.create({
        data: {
          sceneId: dbScene.id,
          costumeId: dbCostume.id,
        },
      });
    }

    for (const loc of scene.locations) {
      const dbLocation = await db.location.upsert({
        where: {
          projectId_name: { projectId, name: loc.name },
        },
        create: { projectId, name: loc.name },
        update: {},
      });

      await db.sceneLocation.create({
        data: {
          sceneId: dbScene.id,
          locationId: dbLocation.id,
        },
      });
    }

    if (scene.vfx) {
      for (const vfx of scene.vfx) {
        const dbVfx = await db.vFX.create({
          data: {
            projectId,
            description: vfx.description,
            complexity: vfx.complexity || "MEDIUM",
          },
        });

        await db.sceneVFX.create({
          data: {
            sceneId: dbScene.id,
            vfxId: dbVfx.id,
          },
        });
      }
    }
  }
}
