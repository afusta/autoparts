// =============================================================================
// Email Value Object
// =============================================================================
// Encapsule la validation et le comportement d'une adresse email
//
// Un Value Object est:
// - Immuable: une fois créé, il ne peut pas être modifié
// - Défini par ses attributs: deux emails sont égaux si l'adresse est identique
// - Auto-validant: impossible de créer un email invalide
//
// Exemple d'utilisation:
//   const email = Email.create('user@example.com'); // Ok
//   const invalid = Email.create('not-an-email');   // Throws Error
// =============================================================================

import { ValueObject } from '@shared/ddd';

interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  // Regex pour validation email (RFC 5322 simplifié)
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(props: EmailProps) {
    super(props);
  }

  /**
   * Retourne la valeur de l'email
   */
  get value(): string {
    return this.props.value;
  }

  /**
   * Factory method pour créer un Email validé
   * @throws Error si l'email est invalide
   */
  static create(email: string): Email {
    if (!email || email.trim().length === 0) {
      throw new Error('Email cannot be empty');
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (!this.EMAIL_REGEX.test(normalizedEmail)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    if (normalizedEmail.length > 255) {
      throw new Error('Email cannot exceed 255 characters');
    }

    return new Email({ value: normalizedEmail });
  }

  /**
   * Reconstruit un Email depuis la base de données (sans validation)
   * À utiliser uniquement par les repositories
   */
  static fromPersistence(email: string): Email {
    return new Email({ value: email });
  }

  /**
   * Retourne le domaine de l'email
   */
  getDomain(): string {
    return this.props.value.split('@')[1];
  }

  toString(): string {
    return this.props.value;
  }
}
