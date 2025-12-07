// =============================================================================
// Money Value Object
// =============================================================================
// Représente une valeur monétaire avec devise
//
// Règles:
// - Le montant ne peut pas être négatif
// - La devise est EUR par défaut
// - Supporte les opérations arithmétiques de base
// =============================================================================

import { ValueObject } from '@shared/ddd';

interface MoneyProps {
  amount: number; // En centimes pour éviter les erreurs de floating point
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  /**
   * Retourne le montant en euros (ou autre devise)
   */
  get value(): number {
    return this.props.amount / 100;
  }

  /**
   * Crée un Money à partir d'un montant en euros
   */
  static fromEuros(euros: number, currency = 'EUR'): Money {
    if (euros < 0) {
      throw new Error('Amount cannot be negative');
    }

    // Convertir en centimes
    const cents = Math.round(euros * 100);

    return new Money({ amount: cents, currency });
  }

  /**
   * Crée un Money à partir de centimes
   */
  static fromCents(cents: number, currency = 'EUR'): Money {
    if (cents < 0) {
      throw new Error('Amount cannot be negative');
    }

    return new Money({ amount: Math.round(cents), currency });
  }

  /**
   * Reconstruit depuis la persistence
   */
  static fromPersistence(cents: number, currency = 'EUR'): Money {
    return new Money({ amount: cents, currency });
  }

  /**
   * Addition
   */
  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return Money.fromCents(this.amount + other.amount, this.currency);
  }

  /**
   * Soustraction
   */
  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Result cannot be negative');
    }
    return Money.fromCents(result, this.currency);
  }

  /**
   * Multiplication
   */
  multiply(factor: number): Money {
    return Money.fromCents(Math.round(this.amount * factor), this.currency);
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot operate on different currencies: ${this.currency} and ${other.currency}`,
      );
    }
  }

  /**
   * Formatage pour affichage
   */
  format(): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: this.currency,
    }).format(this.value);
  }

  toString(): string {
    return this.format();
  }
}
