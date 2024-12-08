import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	imageSize: string;
	imagePath: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	imageSize: '600',
	imagePath: '/img'
}

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;

	async onload() {
		console.log('loading plugin image size');
		await this.loadSettings();

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice by CYY!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');

		// This adds a simple command that can be triggered anywhere
		this.addCommand({
			id: 'open-sample-modal-simple',
			name: 'Open sample modal (simple)',
			callback: () => {
				new SampleModal(this.app).open();
			}
		});
		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'sample-editor-command',
			name: 'Sample editor command',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				console.log(editor.getSelection());
				editor.replaceSelection('Sample Editor Command');
			}
		});
		// This adds a complex command that can check whether the current state of the app allows execution of the command
		this.addCommand({
			id: 'open-sample-modal-complex',
			name: 'Open sample modal (complex)',
			checkCallback: (checking: boolean) => {
				// Conditions to check
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (markdownView) {
					// If checking is true, we're simply "checking" if the command can be run.
					// If checking is false, then we want to actually perform the operation.
					if (!checking) {
						new SampleModal(this.app).open();
					}

					// This command will only show up in Command Palette when the check function returns true
					return true;
				}
			}
		});

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

		this.registerEvent(
			this.app.workspace.on("editor-paste", async (evt: ClipboardEvent, editor: Editor) => {
				const items = evt.clipboardData?.items;

				if (items) {
					for (let i = 0; i < items.length; i++) {
						const item = items[i];
						if (item.type.startsWith("image/")) {
							// 阻止默认粘贴行为
							evt.preventDefault();

							const file = item.getAsFile();
							if (file) {
								const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;
								if (!editor) return;

								// 生成图片名称
								const now = new Date();
								const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
								const imageName = `Pasted image ${timestamp}.png`;
								const imageNameMd = `Pasted%20image%20${timestamp}.png`;

								// // 将图片保存到文件系统
								// const arrayBuffer = await file.arrayBuffer();
								// const data = new Uint8Array(arrayBuffer);
								// await this.app.vault.createBinary(this.settings.imagePath, data);


								// 检查文件是否存在
								const fileExists = await this.app.vault.adapter.exists(imageName);
								if (!fileExists) {
									// 将图片保存到文件系统
									const arrayBuffer = await file.arrayBuffer();
									const data = new Uint8Array(arrayBuffer);
									const imagePath = `${this.settings.imagePath}/${imageName}`;
									await this.app.vault.createBinary(imagePath, data);
								} else {
									console.log("File already exists.");
								}


								// 插入 Markdown 图片链接
								const cursor = editor.getCursor();
								const markdownImage = `![${this.settings.imageSize}](${imageNameMd})`;
								editor.replaceRange(markdownImage, cursor);
							}
							break; // 只处理第一个图片
						}
					}
				}
			})
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const {contentEl} = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Default Image Size')
			.setDesc('Set the default size for pasted images (e.g., 600)')
			.addText(text => text
				.setPlaceholder('Enter size like 600')
				.setValue(this.plugin.settings.imageSize || '600')
				.onChange(async (value) => {
					this.plugin.settings.imageSize = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Image Path')
			.setDesc('Set the default path for pasted images (e.g., /img), better be the same as the attachment folder in your settings.')
			.addText(text => text
				.setPlaceholder('Enter path like /img')
				.setValue(this.plugin.settings.imagePath || '/img')
				.onChange(async (value) => {
					this.plugin.settings.imagePath = value;
					await this.plugin.saveSettings();
				}));

				
	}
}
