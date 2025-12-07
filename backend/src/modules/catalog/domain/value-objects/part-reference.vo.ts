// =============================================================================
// Part Reference Value Object
// =============================================================================
// Représente la référence unique d'une pièce automobile
//
// Format: BRAND-CATEGORY-NUMBER
// Exemple: BOSCH-FLT-12345
//
// La référence est unique par fournisseur
// =============================================================================

import { ValueObject } from '@shared/ddd';

interface PartReferenceProps {
  value: string;
}

export class PartReference extends ValueObject<PartReferenceProps> {
  private static readonly REFERENCE_REGEX = /^[A-Z0-9-]{3,50}$/;

  private constructor(props: PartReferenceProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  /**
   * Crée une référence validée
   */
  static create(reference: string): PartReference {
    if (!reference || reference.trim().length === 0) {
      throw new Error('Part reference cannot be empty');
    }

    const normalized = reference.toUpperCase().trim();

    if (!this.REFERENCE_REGEX.test(normalized)) {
      throw new Error(
        `Invalid part reference format: ${reference}. Must be 3-50 alphanumeric characters with hyphens.`,
      );
    }

    return new PartReference({ value: normalized });
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(reference: string): PartReference {
    return new PartReference({ value: reference });
  }

  toString(): string {
    return this.props.value;
  }
}
