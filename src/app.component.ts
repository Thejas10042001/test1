import { Component, ChangeDetectionStrategy, signal, effect, ElementRef, ViewChild, AfterViewChecked, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from './services/gemini.service';
import { ChatMessage } from './models/chat.model';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule]
})
export class AppComponent implements AfterViewChecked {
  @ViewChild('chatContainer') private chatContainer!: ElementRef;

  userInput = signal('');
  isLoading = signal(false);
  sessionEnded = signal(false);
  reportData = signal<string | null>(null);

  conversation = signal<ChatMessage[]>([
    {
      role: 'model',
      content: "Alright, let's begin. I'm Fahim Sidiqi. I've reviewed your preliminary documents. In your own words, what is the single most significant, quantifiable business outcome we can expect from your platform within the first 12 months, and how do you substantiate that claim?",
    },
  ]);

  private shouldScrollToBottom = false;

  constructor(private geminiService: GeminiService) {
    // Effect to scroll down when conversation updates
     effect(() => {
        const currentConversation = this.conversation();
        untracked(() => {
            this.shouldScrollToBottom = true;
        });
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  scrollToBottom(): void {
    try {
      this.chatContainer.nativeElement.scrollTop = this.chatContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }


  async sendMessage(): Promise<void> {
    const message = this.userInput().trim();
    if (!message || this.isLoading()) {
      return;
    }

    if (message.toUpperCase() === 'END SESSION') {
      await this.endSession();
      return;
    }
    
    // Add user message to conversation
    this.conversation.update(conv => [...conv, { role: 'user', content: message }]);
    this.userInput.set('');
    this.isLoading.set(true);
    
    // Get CIO response
    const history = this.conversation();
    const cioResponse = await this.geminiService.getCIOResponse(history);

    this.conversation.update(conv => [...conv, { role: 'model', content: cioResponse }]);
    this.isLoading.set(false);
  }

  async endSession(): Promise<void> {
    this.isLoading.set(true);
    const history = this.conversation();
    const reportJsonString = await this.geminiService.generateReport(history);
    
    try {
      const parsedReport = JSON.parse(reportJsonString);
      const formattedReport = JSON.stringify(parsedReport, null, 2);
      this.reportData.set(formattedReport);
    } catch (e) {
      console.error("Failed to parse report JSON", e);
      this.reportData.set(reportJsonString); // Show raw string on parse error
    }
    
    this.sessionEnded.set(true);
    this.isLoading.set(false);
  }
}
