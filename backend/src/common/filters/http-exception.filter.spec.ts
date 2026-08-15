import {
  ArgumentsHost,
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Request, Response } from "express";

import { LoggingInterceptor } from "../interceptors/logging.interceptor";
import { HttpExceptionFilter } from "./http-exception.filter";

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: "/api/movies",
      path: "/api/movies",
      method: "GET",
    };

    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  it("should be defined", () => {
    expect(filter).toBeDefined();
  });

  it("should handle HttpException", () => {
    const exception = new HttpException("Movie not found", HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: "Movie not found",
        error: "HttpException",
      }),
    );
  });

  it("should handle HttpException with object response", () => {
    const exception = new HttpException(
      { message: ["Validation error"], error: "Bad Request" },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        message: ["Validation error"],
        error: "Bad Request",
      }),
    );
  });

  it("should handle generic Error", () => {
    const exception = new Error("Internal error");

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "An unexpected error occurred",
        error: "Internal Server Error",
      }),
    );
  });

  it("should sanitize API keys from error messages", () => {
    const exception = new HttpException("Invalid api_key=abc123 provided", HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Invalid api_key=HIDDEN provided",
      }),
    );
  });
});

describe("LoggingInterceptor", () => {
  let interceptor: LoggingInterceptor;
  let mockContext: Partial<ExecutionContext>;
  let mockCallHandler: Partial<CallHandler<unknown>>;

  beforeEach(() => {
    interceptor = new LoggingInterceptor();

    mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({
          method: "GET",
          url: "/api/movies",
          path: "/api/movies",
        }),
      }),
    };

    mockCallHandler = {
      handle: jest.fn().mockReturnValue({
        pipe: jest.fn().mockReturnValue("observable"),
      }),
    };
  });

  it("should be defined", () => {
    expect(interceptor).toBeDefined();
  });

  it("should call next.handle and return observable", () => {
    const result = interceptor.intercept(
      mockContext as ExecutionContext,
      mockCallHandler as CallHandler<unknown>,
    );

    expect(mockCallHandler.handle).toHaveBeenCalled();
    expect(result).toBe("observable");
  });
});
