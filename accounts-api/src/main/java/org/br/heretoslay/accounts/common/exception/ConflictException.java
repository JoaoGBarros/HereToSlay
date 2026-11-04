package org.br.heretoslay.accounts.common.exception;

/** The request clashes with existing data (username taken, profile already created). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
