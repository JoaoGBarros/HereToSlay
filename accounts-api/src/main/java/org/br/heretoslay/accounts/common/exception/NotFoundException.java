package org.br.heretoslay.accounts.common.exception;

/** The requested player or match does not exist. The message is safe to show to the client. */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String message) {
        super(message);
    }
}
