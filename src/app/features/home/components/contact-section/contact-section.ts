import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { siteConfig } from '../../../../core/config/site.config';

interface SocialLink {
  readonly id: 'instagram' | 'whatsapp';
  readonly label: string;
  readonly url: string;
}

@Component({
  selector: 'app-contact-section',
  imports: [NgTemplateOutlet],
  templateUrl: './contact-section.html',
  styleUrl: './contact-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactSection {
  protected readonly socialLinks: readonly SocialLink[] = [
    { id: 'instagram', label: 'Instagram', url: siteConfig.links.instagram },
    { id: 'whatsapp', label: 'WhatsApp', url: siteConfig.links.whatsapp },
  ];
}
