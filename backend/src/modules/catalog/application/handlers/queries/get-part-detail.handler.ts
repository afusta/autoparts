// =============================================================================
// GetPartDetail Query Handler
// =============================================================================

import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Logger } from '@nestjs/common';
import { int } from 'neo4j-driver';
import { GetPartDetailQuery } from '../../queries/get-part-detail.query';
import { PartDetailResult } from '../../queries/types';
import { PartRead } from '../../../infrastructure/read-model/schemas/part-read.schema';
import { Neo4jService } from '@infrastructure/neo4j';

@QueryHandler(GetPartDetailQuery)
export class GetPartDetailHandler implements IQueryHandler<GetPartDetailQuery> {
  private readonly logger = new Logger(GetPartDetailHandler.name);

  constructor(
    @InjectModel(PartRead.name) private partModel: Model<PartRead>,
    private readonly neo4j: Neo4jService,
  ) {}

  async execute(query: GetPartDetailQuery): Promise<PartDetailResult> {
    this.logger.debug(`Getting part detail: ${query.partId}`);

    const part = await this.partModel.findOne({ partId: query.partId }).exec();

    if (!part) {
      return { part: null, frequentlyOrderedWith: [] };
    }

    // Enrich with frequently ordered together parts from Neo4j
    const frequentlyOrderedWith = await this.findFrequentlyOrderedTogether(
      query.partId,
      5,
    );

    return {
      part,
      frequentlyOrderedWith,
    };
  }

  private async findFrequentlyOrderedTogether(
    partId: string,
    limit = 5,
  ): Promise<
    Array<{ partId: string; name: string; reference: string; count: number }>
  > {
    try {
      const result = await this.neo4j.read(
        `
        MATCH (p1:Part {id: $partId})<-[:CONTAINS]-(o:Order)-[:CONTAINS]->(p2:Part)
        WHERE p1 <> p2
        RETURN p2.id as partId, p2.name as name, p2.reference as reference, count(o) as count
        ORDER BY count DESC
        LIMIT $limit
        `,
        { partId, limit: int(limit) },
      );

      return (result as Record<string, unknown>[]).map((record) => ({
        partId: record.partId as string,
        name: record.name as string,
        reference: record.reference as string,
        count:
          typeof record.count === 'number'
            ? record.count
            : (record.count as { toNumber: () => number }).toNumber(),
      }));
    } catch (error) {
      this.logger.warn(`Failed to get frequently ordered parts: ${error}`);
      return [];
    }
  }
}
