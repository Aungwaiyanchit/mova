import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common";

@Injectable()
export class ParseInfoHashPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!/^[a-f0-9]{40}$/i.test(value)) {
      throw new BadRequestException("Info hash must contain exactly 40 hexadecimal characters");
    }
    return value.toLowerCase();
  }
}
