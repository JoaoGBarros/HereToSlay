package org.br.heretoslay.accounts.common.exception;

/** A call to an outside service (Firebase) failed. Details go to the log, not to the client. */
public class ExternalServiceException extends RuntimeException {

    public ExternalServiceException(String message, Throwable cause) {
        super(message, cause);
    }
}
