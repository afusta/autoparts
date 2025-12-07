// =============================================================================
// Vehicle Compatibility Value Object
// =============================================================================
// Représente la compatibilité d'une pièce avec un véhicule
//
// Contient:
// - Marque (brand): Renault, Peugeot, etc.
// - Modèle (model): Clio, 308, etc.
// - Années (yearFrom, yearTo): Plage d'années de production
// - Motorisation (engine): 1.5 dCi, 1.6 THP, etc. (optionnel)
// =============================================================================

import { ValueObject } from '@shared/ddd';

interface VehicleCompatibilityProps {
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  engine?: string;
}

export class VehicleCompatibility extends ValueObject<VehicleCompatibilityProps> {
  private constructor(props: VehicleCompatibilityProps) {
    super(props);
  }

  get brand(): string {
    return this.props.brand;
  }

  get model(): string {
    return this.props.model;
  }

  get yearFrom(): number {
    return this.props.yearFrom;
  }

  get yearTo(): number {
    return this.props.yearTo;
  }

  get engine(): string | undefined {
    return this.props.engine;
  }

  /**
   * Crée une compatibilité véhicule validée
   */
  static create(
    brand: string,
    model: string,
    yearFrom: number,
    yearTo: number,
    engine?: string,
  ): VehicleCompatibility {
    if (!brand || brand.trim().length === 0) {
      throw new Error('Vehicle brand is required');
    }

    if (!model || model.trim().length === 0) {
      throw new Error('Vehicle model is required');
    }

    const currentYear = new Date().getFullYear();

    if (yearFrom < 1900 || yearFrom > currentYear + 2) {
      throw new Error(`Invalid yearFrom: ${yearFrom}`);
    }

    if (yearTo < yearFrom || yearTo > currentYear + 2) {
      throw new Error(`Invalid yearTo: ${yearTo}. Must be >= yearFrom and <= ${currentYear + 2}`);
    }

    return new VehicleCompatibility({
      brand: brand.trim(),
      model: model.trim(),
      yearFrom,
      yearTo,
      engine: engine?.trim(),
    });
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(data: {
    brand: string;
    model: string;
    yearFrom: number;
    yearTo: number;
    engine?: string;
  }): VehicleCompatibility {
    return new VehicleCompatibility(data);
  }

  /**
   * Vérifie si compatible avec un véhicule spécifique
   */
  isCompatibleWith(brand: string, model: string, year: number): boolean {
    return (
      this.brand.toLowerCase() === brand.toLowerCase() &&
      this.model.toLowerCase() === model.toLowerCase() &&
      year >= this.yearFrom &&
      year <= this.yearTo
    );
  }

  /**
   * Retourne une description lisible
   */
  toString(): string {
    const years = `${this.yearFrom}-${this.yearTo}`;
    const engine = this.engine ? ` ${this.engine}` : '';
    return `${this.brand} ${this.model} (${years})${engine}`;
  }

  /**
   * Retourne une clé unique pour comparaison
   */
  toKey(): string {
    return `${this.brand}|${this.model}|${this.yearFrom}|${this.yearTo}|${this.engine || ''}`.toLowerCase();
  }
}
